--------------------------------------------------------------------------------
--// buff_card.lua — Auto Buff Card Selector
-- Mendeteksi kartu di PlayerBonusCard.Cards lalu otomatis fire RemoteEvent
-- sesuai toggle yang diaktifkan user. Fire hanya 1x per update kartu.
--
-- Slot 1-3 → FireServer("Select", slotNum)
-- Slot 4   → FireServer("Unlock", 4)
--
-- Priority rules:
--   1. Jika kartu sama muncul di Unlock (4) DAN Select (1-3) → hanya fire Unlock
--   2. Jika kartu sama di beberapa slot Select → pilih slot tertinggi
--   3. Jika user enable beberapa kartu dengan nama dasar sama → pilih numeral tertinggi
--   4. Numeral sama → pilih yang pertama di-toggle (urutan di CARD_NAMES)
--------------------------------------------------------------------------------
local H                = getgenv().Hub
local EngineConfig     = H.EngineConfig
local WorldBonusCardRE = H.WorldBonusCardRE
local Services         = H.Services
local LocalPlayer      = Services.Players.LocalPlayer

-- Ordered list — posisi menentukan tie-breaker "pertama di-toggle"
local CARD_NAMES = {
    "Skill Cooldown I",   "Dash Cooldown II",  "Critical Damage VI",
    "Critical Chance I",  "Healing IV",         "Frost IV",
    "Base Attack V",      "Dash Speed V",        "Attack I",
    "Coroside III",       "Methyais VI",         "Movement Speed IV",
    "MAX Health IV",
}

local TOGGLE_ORDER = {}
for i, name in ipairs(CARD_NAMES) do TOGGLE_ORDER[name] = i end

-- Roman numeral parser (trailing suffix)
local ROMAN = {I=1, V=5, X=10, L=50, C=100, D=500, M=1000}
local function romanVal(cardName)
    local s = (cardName:match("%s([IVXLCDMivxlcdm]+)$") or ""):upper()
    if s == "" then return 0 end
    local val, prev = 0, 0
    for i = #s, 1, -1 do
        local c = ROMAN[s:sub(i, i)] or 0
        if c < prev then val = val - c else val = val + c end
        prev = c
    end
    return val
end

local function baseName(name)
    return name:match("^(.-)%s+[IVXLCDMivxlcdm]+$") or name
end

-- Case-insensitive match terhadap kartu yang di-enable user
local function matchEnabled(cardText)
    local enabled = EngineConfig.BuffCardEnabled or {}
    local base = baseName(cardText):lower()
    for cat, on in pairs(enabled) do
        if on and cat:lower() == base then return cat end
    end
    return nil
end

-- Lazy-fetch WorldBonusCardRE kalau nil saat core.lua load terlalu awal
local function getWBCRE()
    if H.WorldBonusCardRE then return H.WorldBonusCardRE end
    local ok, re = pcall(function()
        return game:GetService("ReplicatedStorage")
            :WaitForChild("Framework",10)
            :WaitForChild("Gameplay",10)
            :WaitForChild("WorldPlace",10)
            :WaitForChild("WorldBonusCardUtil",10)
            :WaitForChild("RemoteEvent",10)
    end)
    if ok and re then H.WorldBonusCardRE = re end
    return H.WorldBonusCardRE
end

-- Baca teks kartu dari instance item (untuk computeActions)
local function getCardText(item)
    local ok, lbl = pcall(function() return item.BTN.Stat.Name end)
    if ok and lbl and lbl:IsA("TextLabel") then
        return lbl.Text:gsub("\n", " "):match("^%s*(.-)%s*$")
    end
    for _, d in ipairs(item:GetDescendants()) do
        if d.Name == "Name" and d:IsA("TextLabel") then
            return d.Text:gsub("\n", " "):match("^%s*(.-)%s*$")
        end
    end
    return nil
end

-- Hitung aksi yang perlu di-fire (membaca semua slot sekaligus untuk priority)
local function computeActions()
    local re = getWBCRE()
    if not re then return {} end
    local gui = LocalPlayer:FindFirstChild("PlayerGui")
    if not gui then return {} end
    local ok, cards = pcall(function()
        return gui.MainGuiIgnoreGuiInset.PlayerBonusCard.Cards
    end)
    if not ok or not cards then return {} end

    local matched = {}
    for _, item in ipairs(cards:GetChildren()) do
        local slotNum = tonumber(item.Name:match("^Item(%d+)$"))
        if slotNum then
            local text = getCardText(item)
            if text and text ~= "" then
                local ename = matchEnabled(text)
                if ename then
                    if not matched[ename] then
                        matched[ename] = { slots = {}, unlock = false }
                    end
                    if slotNum == 4 then
                        matched[ename].unlock = true
                    else
                        table.insert(matched[ename].slots, slotNum)
                    end
                end
            end
        end
    end

    local baseGroups = {}
    for name, data in pairs(matched) do
        local base = baseName(name)
        if not baseGroups[base] then baseGroups[base] = {} end
        table.insert(baseGroups[base], { name = name, data = data })
    end

    local actions = {}
    for _, group in pairs(baseGroups) do
        table.sort(group, function(a, b)
            if a.data.unlock ~= b.data.unlock then return a.data.unlock end
            local ra, rb = romanVal(a.name), romanVal(b.name)
            if ra ~= rb then return ra > rb end
            return (TOGGLE_ORDER[a.name] or 999) < (TOGGLE_ORDER[b.name] or 999)
        end)
        local best = group[1]
        if best.data.unlock then
            table.insert(actions, { action = "Unlock", slot = 4 })
        elseif #best.data.slots > 0 then
            local bestSlot = 0
            for _, s in ipairs(best.data.slots) do
                if s > bestSlot then bestSlot = s end
            end
            table.insert(actions, { action = "Select", slot = bestSlot })
        end
    end

    return actions
end

-- Fire semua aksi (debounced)
local _lastFire = 0
local function fireBuffCards()
    if not EngineConfig.BuffCardActive then return end
    local now = tick()
    if now - _lastFire < 0.3 then return end
    _lastFire = now

    local re = getWBCRE()
    if not re then return end

    local actions = computeActions()
    for _, act in ipairs(actions) do
        if act.action == "Select" then
            pcall(function() re:FireServer("Select", act.slot) end)
        elseif act.action == "Unlock" then
            pcall(function() re:FireServer("Unlock", 4) end)
        end
    end
end

--------------------------------------------------------------------------------
-- Scan engine — menggunakan pattern scan user
--------------------------------------------------------------------------------
local _scanConns    = {}   -- semua connections aktif
local _scanRunning  = false

local function cleanupScan()
    _scanRunning = false
    for _, c in ipairs(_scanConns) do pcall(function() c:Disconnect() end) end
    _scanConns = {}
end

-- Pantau satu TextLabel "Name": fire sekarang + monitor perubahan teks
local function pantauLabel(instance)
    if instance.Name ~= "Name" or not instance:IsA("TextLabel") then return end

    -- Fire untuk teks saat ini
    if EngineConfig.BuffCardActive then
        fireBuffCards()
    end

    -- Monitor perubahan teks di label ini
    local conn = instance:GetPropertyChangedSignal("Text"):Connect(function()
        if not EngineConfig.BuffCardActive then return end
        task.wait(0.05)
        fireBuffCards()
    end)
    table.insert(_scanConns, conn)
end

-- Scan rekursif untuk elemen yang sudah ada
local function scanAwal(instance)
    if not instance then return end
    pantauLabel(instance)
    for _, child in ipairs(instance:GetChildren()) do
        scanAwal(child)
    end
end

local function startScan()
    print("[XiFil BuffCard] startScan dipanggil, _scanRunning=" .. tostring(_scanRunning))
    if _scanRunning then
        fireBuffCards()
        return
    end
    _scanRunning = true
    print("[XiFil BuffCard] task.spawn dimulai")

    task.spawn(function()
        print("[XiFil BuffCard] task jalan")

        -- Cari PlayerGui tanpa WaitForChild agar tidak gantung di executor tertentu
        local gui = LocalPlayer:FindFirstChild("PlayerGui")
        if not gui then
            local t = 0
            repeat task.wait(0.5); t = t + 0.5
                gui = LocalPlayer:FindFirstChild("PlayerGui")
            until gui or t >= 30
        end
        if not gui then print("[XiFil BuffCard] PlayerGui tidak ditemukan"); cleanupScan(); return end
        print("[XiFil BuffCard] PlayerGui OK")

        print("[XiFil BuffCard] === MEMULAI PEMANTAUAN AUTO-UPDATE ===")

        -- Tunggu Cards container muncul (loop agar tahan re-round)
        while _scanRunning and EngineConfig.BuffCardActive do
            local ok, cardsContainer = pcall(function()
                return gui.MainGuiIgnoreGuiInset.PlayerBonusCard.Cards
            end)

            if ok and cardsContainer then
                print("[XiFil BuffCard] Cards ditemukan — scan awal")

                -- Reset koneksi lama kecuali _scanRunning flag
                local oldConns = _scanConns
                _scanConns = {}
                for _, c in ipairs(oldConns) do pcall(function() c:Disconnect() end) end

                -- Scan elemen yang sudah ada
                scanAwal(cardsContainer)

                -- Monitor elemen baru yang ditambahkan
                local descConn = cardsContainer.DescendantAdded:Connect(function(descendant)
                    if not EngineConfig.BuffCardActive then return end
                    task.wait(0.1)
                    pantauLabel(descendant)
                end)
                table.insert(_scanConns, descConn)

                print("[XiFil BuffCard] === SCRIPT BERJALAN DI LATAR BELAKANG ===")

                -- Tunggu sampai Cards hilang (ronde selesai) atau scan dimatikan
                while _scanRunning and EngineConfig.BuffCardActive do
                    task.wait(0.5)
                    if not cardsContainer.Parent then
                        print("[XiFil BuffCard] Cards hilang — tunggu ronde berikutnya")
                        break
                    end
                end

                -- Bersihkan koneksi ronde ini (tapi biarkan loop lanjut kalau masih aktif)
                for _, c in ipairs(_scanConns) do pcall(function() c:Disconnect() end) end
                _scanConns = {}

            else
                -- Cards belum ada, tunggu sebentar
                task.wait(0.5)
            end
        end

        -- Keluar dari loop = BuffCardActive OFF atau stopScan dipanggil
        cleanupScan()
        print("[XiFil BuffCard] Scan berhenti")
    end)
end

local function stopScan()
    cleanupScan()
end

H.BuffCard_FireNow  = function()
    if EngineConfig.BuffCardActive then
        startScan()
    end
end
H.BuffCard_StopScan = stopScan

--------------------------------------------------------------------------------
-- Export
--------------------------------------------------------------------------------
