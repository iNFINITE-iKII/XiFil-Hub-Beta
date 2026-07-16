--------------------------------------------------------------------------------
--// buff_card.lua — Auto Buff Card Selector
-- Strategi: daripada menebak args FireServer, langsung klik BTN di tiap slot
-- menggunakan firebutton (exploit API) — game yang handle semua logikanya.
--
-- Priority rules (kartu yang diclick):
--   1. Jika kategori match → click BTN slot tersebut
--   2. Slot 4 (Unlock) dan slot 1-3 (Select) sama-sama langsung diklik
--   3. Jika satu kategori muncul di beberapa slot → klik semua yang match
--------------------------------------------------------------------------------
local H            = getgenv().Hub
local EngineConfig = H.EngineConfig
local Services     = H.Services
local LocalPlayer  = Services.Players.LocalPlayer

-- Roman numeral parser (trailing suffix)
local ROMAN = {I=1,V=5,X=10,L=50,C=100,D=500,M=1000}
local function romanVal(cardName)
    local s = (cardName:match("%s([IVXLCDMivxlcdm]+)$") or ""):upper()
    if s == "" then return 0 end
    local val, prev = 0, 0
    for i = #s, 1, -1 do
        local c = ROMAN[s:sub(i,i)] or 0
        if c < prev then val = val - c else val = val + c end
        prev = c
    end
    return val
end

-- Ambil nama dasar kartu (buang angka romawi di akhir)
local function baseName(name)
    return name:match("^(.-)%s+[IVXLCDMivxlcdm]+$") or name
end

-- Baca teks kartu: scan SEMUA TextLabel, prioritaskan bernama "Name"/"Title"
local function getCardText(item)
    local best = nil
    for _, d in ipairs(item:GetDescendants()) do
        if d:IsA("TextLabel") and d.Text ~= "" then
            local t = d.Text:gsub("\n"," "):match("^%s*(.-)%s*$")
            if t and #t >= 3 and not t:match("^[%d%s%p]+$") then
                if d.Name == "Name" or d.Name == "Title" then
                    return t  -- prioritas tertinggi
                end
                if not best then best = t end
            end
        end
    end
    return best
end

-- Cek apakah teks kartu match dengan kategori yang di-enable
local function isEnabled(cardText)
    local enabled = EngineConfig.BuffCardEnabled or {}
    local base = baseName(cardText):lower()
    for cat, on in pairs(enabled) do
        if on and cat:lower() == base then return true, cat end
    end
    return false, nil
end

-- Cari BTN (tombol) di dalam slot item
local function findButton(item)
    -- Path yang sudah diketahui: item.BTN
    local btn = item:FindFirstChild("BTN")
    if btn and (btn:IsA("TextButton") or btn:IsA("ImageButton") or btn:IsA("GuiButton")) then
        return btn
    end
    -- Kalau BTN ada tapi bukan GuiButton langsung, cari GuiButton di dalamnya
    if btn then
        for _, d in ipairs(btn:GetDescendants()) do
            if d:IsA("TextButton") or d:IsA("ImageButton") then return d end
        end
        -- BTN itu sendiri mungkin Frame yang bertindak sebagai tombol
        -- coba return BTN-nya langsung (beberapa executor support frame juga)
        return btn
    end
    -- Fallback: scan seluruh slot
    for _, d in ipairs(item:GetDescendants()) do
        if d:IsA("TextButton") or d:IsA("ImageButton") then return d end
    end
    return nil
end

-- Klik satu slot kartu menggunakan exploit firebutton
local function clickSlot(item, cardText)
    local btn = findButton(item)
    if not btn then
        warn("[XiFil BuffCard] Tidak ada button di slot", item.Name, "— skip")
        return
    end
    print("[XiFil BuffCard] Klik slot", item.Name, "/", cardText, "→", btn:GetFullName())

    -- firebutton: standard exploit API (Synapse, KRNL, Xeno, dsb.)
    local ok1 = pcall(firebutton, btn, "")
    if not ok1 then
        -- Fallback: fire signal MouseButton1Click langsung
        local ok2 = pcall(function() btn.MouseButton1Click:Fire() end)
        if not ok2 then
            warn("[XiFil BuffCard] firebutton dan MouseButton1Click:Fire() keduanya gagal untuk", btn:GetFullName())
        end
    end
end

-- Cari Cards container di mana pun dalam PlayerGui (recursive)
local function findCardsContainer()
    local gui = LocalPlayer:FindFirstChild("PlayerGui")
    if not gui then return nil end
    local pbc = gui:FindFirstChild("PlayerBonusCard", true)
    if not pbc then return nil end
    return pbc:FindFirstChild("Cards")
end

-- Proses semua kartu yang ada: click yang match kategori enabled
local _lastFire = 0
local function fireBuffCards()
    if not EngineConfig.BuffCardActive then return end
    local now = tick()
    if now - _lastFire < 0.3 then return end
    _lastFire = now

    local cards = findCardsContainer()
    if not cards then
        print("[XiFil BuffCard] fireBuffCards: Cards tidak ditemukan")
        return
    end

    local children = cards:GetChildren()
    print("[XiFil BuffCard] fireBuffCards: scan", #children, "slot")

    for _, item in ipairs(children) do
        local text = getCardText(item)
        if text then
            local ok, cat = isEnabled(text)
            if ok then
                print("[XiFil BuffCard] Match:", item.Name, "→", text, "(cat:", cat..")")
                clickSlot(item, text)
            else
                print("[XiFil BuffCard] No match:", item.Name, "→", text)
            end
        else
            print("[XiFil BuffCard] Teks tidak terbaca di slot:", item.Name)
        end
    end
end

--------------------------------------------------------------------------------
-- Monitor: pantau PlayerBonusCard di seluruh PlayerGui
--------------------------------------------------------------------------------
task.spawn(function()
    local gui = LocalPlayer:WaitForChild("PlayerGui", 30)
    if not gui then warn("[XiFil BuffCard] PlayerGui tidak ditemukan"); return end

    local function handlePBC(pbc)
        print("[XiFil BuffCard] PlayerBonusCard ditemukan:", pbc:GetFullName())
        local ok, cards = pcall(function() return pbc:WaitForChild("Cards", 15) end)
        if not ok or not cards then
            warn("[XiFil BuffCard] 'Cards' tidak ditemukan")
            return
        end
        print("[XiFil BuffCard] Cards OK, awal:", #cards:GetChildren(), "item")

        task.wait(0.15)
        fireBuffCards()

        -- Pantau penambahan kartu baru
        local conn = cards.DescendantAdded:Connect(function(desc)
            if desc:IsA("TextLabel") or desc:IsA("Frame") or desc:IsA("ImageLabel") then
                task.wait(0.15)
                fireBuffCards()
            end
        end)

        -- Tunggu sampai GUI hilang (ronde selesai)
        repeat task.wait(0.5) until pbc.Parent == nil
        pcall(function() conn:Disconnect() end)
        print("[XiFil BuffCard] PlayerBonusCard hilang, tunggu ronde berikutnya")
    end

    -- Scan existing
    for _, desc in ipairs(gui:GetDescendants()) do
        if desc.Name == "PlayerBonusCard" then
            task.spawn(handlePBC, desc)
        end
    end

    -- Listen untuk yang baru
    gui.DescendantAdded:Connect(function(desc)
        if desc.Name == "PlayerBonusCard" then
            task.spawn(handlePBC, desc)
        end
    end)

    print("[XiFil BuffCard] Monitor aktif")
end)

H.BuffCard_FireNow = fireBuffCards

--------------------------------------------------------------------------------
-- Export
--------------------------------------------------------------------------------
