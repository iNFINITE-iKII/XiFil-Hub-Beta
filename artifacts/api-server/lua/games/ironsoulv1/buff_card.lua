--------------------------------------------------------------------------------
--// buff_card.lua — Auto Buff Card Selector
-- Background loop otomatis aktif sejak load.
-- Saat BuffCardActive ON + Cards GUI muncul → scan & fire RemoteEvent.
--
-- Slot 1-3 → FireServer("Select", slotNum)
-- Slot 4   → FireServer("Unlock", 4)
--------------------------------------------------------------------------------
print("[XiFil BuffCard] buff_card.lua mulai load")

local H            = getgenv().Hub
local EngineConfig = H.EngineConfig
local Services     = H.Services
local LocalPlayer  = Services.Players.LocalPlayer

-- Roman numeral parser
local ROMAN = {I=1,V=5,X=10,L=50,C=100,D=500,M=1000}
local function romanVal(name)
    local s = (name:match("%s([IVXLCDMivxlcdm]+)$") or ""):upper()
    if s == "" then return 0 end
    local val, prev = 0, 0
    for i = #s, 1, -1 do
        local c = ROMAN[s:sub(i,i)] or 0
        if c < prev then val = val - c else val = val + c end
        prev = c
    end
    return val
end

local function baseName(name)
    return name:match("^(.-)%s+[IVXLCDMivxlcdm]+$") or name
end

-- Cek apakah teks kartu match kategori yang di-enable (base name, case-insensitive)
local function matchEnabled(text)
    local enabled = EngineConfig.BuffCardEnabled or {}
    local base = baseName(text):lower()
    for cat, on in pairs(enabled) do
        if on and cat:lower() == base then return cat end
    end
    return nil
end

-- Non-blocking fetch RemoteEvent
local function getWBCRE()
    if H.WorldBonusCardRE then return H.WorldBonusCardRE end
    local ok, re = pcall(function()
        local rs  = game:GetService("ReplicatedStorage")
        local fw  = rs:FindFirstChild("Framework");          if not fw  then return nil end
        local gp  = fw:FindFirstChild("Gameplay");           if not gp  then return nil end
        local wp  = gp:FindFirstChild("WorldPlace");         if not wp  then return nil end
        local wbc = wp:FindFirstChild("WorldBonusCardUtil"); if not wbc then return nil end
        return wbc:FindFirstChild("RemoteEvent")
    end)
    if ok and re then
        H.WorldBonusCardRE = re
        print("[XiFil BuffCard] WorldBonusCardRE:", re:GetFullName())
    end
    return H.WorldBonusCardRE
end

-- Baca teks kartu dari item slot
local function getCardText(item)
    for _, d in ipairs(item:GetDescendants()) do
        if d.Name == "Name" and d:IsA("TextLabel") and d.Text ~= "" then
            return d.Text:gsub("\n"," "):match("^%s*(.-)%s*$")
        end
    end
    return nil
end

-- Fire semua slot yang match kategori enabled (priority: Unlock > numeral tertinggi > slot tertinggi)
local _lastFire = 0
local function fireBuffCards(cards)
    if not EngineConfig.BuffCardActive then return end
    local now = tick()
    if now - _lastFire < 0.3 then return end
    _lastFire = now

    local re = getWBCRE()
    if not re then
        print("[XiFil BuffCard] RE belum tersedia, skip fire")
        return
    end

    -- Kumpulkan semua slot yang match
    local matched = {}  -- cat → {slots=[], unlock=false, rv=0}
    for _, item in ipairs(cards:GetChildren()) do
        local slotNum = tonumber(item.Name:match("^Item(%d+)$"))
                     or tonumber(item.Name:match("^Slot(%d+)$"))
                     or tonumber(item.Name:match("^(%d+)$"))
        if slotNum then
            local text = getCardText(item)
            if text and text ~= "" then
                local cat = matchEnabled(text)
                if cat then
                    local base = baseName(text)
                    if not matched[base] then
                        matched[base] = {slots={}, unlock=false, rv=romanVal(text), cat=cat}
                    end
                    if romanVal(text) > matched[base].rv then
                        matched[base].rv  = romanVal(text)
                        matched[base].cat = cat
                    end
                    if slotNum == 4 then
                        matched[base].unlock = true
                    else
                        table.insert(matched[base].slots, slotNum)
                    end
                end
            end
        end
    end

    for _, data in pairs(matched) do
        if data.unlock then
            print("[XiFil BuffCard] FireServer Unlock 4 (", data.cat, ")")
            pcall(function() re:FireServer("Unlock", 4) end)
        elseif #data.slots > 0 then
            local best = 0
            for _, s in ipairs(data.slots) do if s > best then best = s end end
            print("[XiFil BuffCard] FireServer Select", best, "(", data.cat, ")")
            pcall(function() re:FireServer("Select", best) end)
        end
    end
end

--------------------------------------------------------------------------------
-- Koneksi scan aktif
--------------------------------------------------------------------------------
local _conns = {}

local function clearConns()
    for _, c in ipairs(_conns) do pcall(function() c:Disconnect() end) end
    _conns = {}
end

-- Pasang listener pada satu TextLabel "Name"
local function watchLabel(label, cards)
    local conn = label:GetPropertyChangedSignal("Text"):Connect(function()
        if not EngineConfig.BuffCardActive then return end
        task.wait(0.05)
        fireBuffCards(cards)
    end)
    table.insert(_conns, conn)
end

--------------------------------------------------------------------------------
-- Background loop — berjalan sejak load, tidak perlu dipanggil
--------------------------------------------------------------------------------
task.spawn(function()
    print("[XiFil BuffCard] Background loop dimulai")

    -- Tunggu PlayerGui
    local gui = LocalPlayer:FindFirstChild("PlayerGui")
    while not gui do
        task.wait(0.5)
        gui = LocalPlayer:FindFirstChild("PlayerGui")
    end
    print("[XiFil BuffCard] PlayerGui ditemukan")

    while true do
        task.wait(0.5)

        if not EngineConfig.BuffCardActive then
            -- OFF: pastikan koneksi dibersihkan
            if #_conns > 0 then clearConns() end
            continue  -- lanjut loop tanpa scan
        end

        -- Cari Cards container
        local ok, cards = pcall(function()
            return gui.MainGuiIgnoreGuiInset.PlayerBonusCard.Cards
        end)
        if not ok or not cards then continue end

        -- Cards ditemukan & aktif — jalankan scan satu sesi ronde
        clearConns()
        print("[XiFil BuffCard] === MEMULAI PEMANTAUAN AUTO-UPDATE ===")

        -- Scan label yang sudah ada
        local function scanAwal(inst)
            if inst.Name == "Name" and inst:IsA("TextLabel") then
                watchLabel(inst, cards)
                local ok2, text = pcall(function() return inst.Text end)
                if ok2 and text and text ~= "" then
                    local info = text:gsub("\n"," "):match("^%s*(.-)%s*$")
                    print("[AWAL]", inst:GetFullName(), "|Text;", info)
                end
            end
            for _, child in ipairs(inst:GetChildren()) do scanAwal(child) end
        end
        scanAwal(cards)

        -- Fire untuk kartu yang sudah ada
        fireBuffCards(cards)

        -- Monitor kartu baru
        local descConn = cards.DescendantAdded:Connect(function(desc)
            if not EngineConfig.BuffCardActive then return end
            task.wait(0.1)
            if desc.Name == "Name" and desc:IsA("TextLabel") then
                watchLabel(desc, cards)
                local ok2, text = pcall(function() return desc.Text end)
                if ok2 and text and text ~= "" then
                    local info = text:gsub("\n"," "):match("^%s*(.-)%s*$")
                    print("[BARU]", desc:GetFullName(), "|Text;", info)
                    fireBuffCards(cards)
                end
            end
        end)
        table.insert(_conns, descConn)

        print("[XiFil BuffCard] === SCRIPT BERJALAN DI LATAR BELAKANG ===")

        -- Tunggu sampai ronde selesai (Cards hilang)
        repeat task.wait(0.5) until not cards.Parent or not EngineConfig.BuffCardActive

        clearConns()
        print("[XiFil BuffCard] Sesi selesai — menunggu ronde/toggle berikutnya")
    end
end)

H.BuffCard_FireNow = function()
    -- Dipanggil dari tab_farm saat toggle/kategori berubah
    -- Background loop yang handle; tinggal reset debounce agar langsung fire
    _lastFire = 0
end

H.BuffCard_StopScan = function()
    clearConns()
end

print("[XiFil BuffCard] buff_card.lua selesai load")

--------------------------------------------------------------------------------
-- Export
--------------------------------------------------------------------------------
