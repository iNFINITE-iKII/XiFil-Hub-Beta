--------------------------------------------------------------------------------
--// navigation.lua — S07 Navigation Engine
--------------------------------------------------------------------------------
local H               = getgenv().Hub
local EngineConfig    = H.EngineConfig
local WORLD_INDEX     = H.WORLD_INDEX
local Workspace       = H.Workspace
local Services        = H.Services
local CombatEngine    = H.CombatEngine
local CustomNotify    = H.CustomNotify
local checkVictoryUi  = H.checkVictoryUi
local DisableAutoFarm = H.DisableAutoFarm

-- [S07] NAVIGATION ENGINE (MODERN FRAMEWORK)
-- Logika navigasi diambil dari MODERN Object-Oriented Framework,
-- diadaptasi penuh untuk sistem nama world dan toggle XiFil Pro V3.
-- World 1 = Starless Forest (idx 1), World 2 = Frozen Valley (idx 2), World 3 = Oathlost Castle (idx 3)
--------------------------------------------------------------------------------
local Navigation = {}

-- Fungsi ini menggunakan pendekatan deterministik.
-- Sistem mengutamakan part fisik bernama "Root" yang berada di permukaan tanah.
-- Jika tidak ditemukan, fallback aman menggunakan GetPivot() dijalankan.
function Navigation.GetPortalRootCFrame(portalInstance)
    if not portalInstance then return nil end

    -- Mencari komponen fisik detektor ground-level secara langsung
    local root = portalInstance:FindFirstChild("Root")
    if root and root:IsA("BasePart") then
        return root.CFrame
    end

    -- Fallback aman untuk mempertahankan kompatibilitas model umum
    if portalInstance:IsA("Model") then
        return portalInstance.PrimaryPart and portalInstance.PrimaryPart.CFrame or portalInstance:GetPivot()
    elseif portalInstance:IsA("BasePart") then
        return portalInstance.CFrame
    end
    return nil
end

-- Menambahkan penanganan aman terhadap parameter worldIdx.
-- Menerapkan perbandingan string secara ketat (==) pada World 1 & 2 untuk mencegah salah target
-- ke objek dekoratif langit, serta mempertahankan pencocokan pola khusus untuk World 3.
function Navigation.GetSingleClosestPortal(portalName, myPosition, worldIdx)
    local roundDoor = Workspace:FindFirstChild("RoundDoor")
    if not roundDoor then return nil end

    local closestPortalRoot = nil
    local shortestDistance = math.huge
    local children = roundDoor:GetChildren()

    -- Penapisan aman untuk mengantisipasi nilai parameter kosong (nil)
    local activeIdx = worldIdx or (WORLD_INDEX[EngineConfig.SelectedWorld] or 1)

    for i = 1, #children do
        local obj = children[i]
        local isMatch = false

        if activeIdx == 3 then
            -- Mempertahankan pola penamaan dinamis untuk World 3 (Oathlost Castle)
            if string.match(obj.Name, "^Portal%d+_%d+$") or string.match(obj.Name, "^%d+_%d+$") then
                isMatch = true
            end
        else
            -- Menggunakan kesetaraan ketat untuk World 1 dan World 2 demi keamanan spasial
            if obj.Name:lower() == portalName:lower() then
                isMatch = true
            end
        end

        if isMatch then
            local cf = Navigation.GetPortalRootCFrame(obj)
            if cf then
                local distance = (myPosition - cf.Position).Magnitude
                if distance < shortestDistance then
                    shortestDistance = distance
                    closestPortalRoot = cf
                end
            end
        end
    end
    return closestPortalRoot
end

function Navigation.GetClosestObject(folderName, objectName, myPosition)
    local folder = Workspace:FindFirstChild(folderName) or (folderName == "Workspace" and Workspace)
    if not folder then return nil end

    local closest = nil
    local shortestDistance = math.huge
    local children = folder:GetChildren()

    for i = 1, #children do
        local obj = children[i]
        if obj.Name == objectName or obj.Name:lower():find(objectName:lower()) then
            local cf = obj:IsA("Model") and obj:GetPivot() or (obj:IsA("BasePart") and obj.CFrame)
            if cf then
                local distance = (myPosition - cf.Position).Magnitude
                if distance < shortestDistance then
                    shortestDistance = distance
                    closest = obj
                end
            end
        end
    end
    return closest
end

-- Cek: apakah ada target aktif sekarang? (berdasarkan target yang dipilih)
local function anyActiveTargetExists()
    if not EngineConfig.AutoFarmActive then return false end
    if EngineConfig.FarmTargetChest and #CombatEngine.GetValidChests()>0 then return true end
    if EngineConfig.FarmTargetEgg and Workspace:FindFirstChild("DragonEgg") then return true end
    if EngineConfig.FarmTargetMonster and #CombatEngine.GetValidMonsters()>0 then return true end
    return false
end

-- ── World 1 (Starless Forest): orbit 3 tier 50/150/250, lalu cari portal, lalu idle ──
function Navigation.SearchWorld1(myHRP, myHum)
    -- [INSTANT CHECK] Jika saat dipanggil ternyata world sudah berubah, langsung batalkan!
    if WORLD_INDEX[EngineConfig.SelectedWorld] ~= 1 then return end

    myHum.PlatformStand = true
    print("[SYSTEM W1] Room vacant! Searching fallback nodes...")

    local door = Navigation.GetClosestObject("RoundDoor", "Door", myHRP.Position)
    if door then
        CombatEngine.ResetPhysics(myHRP)
        myHRP.CFrame = door:IsA("Model") and door:GetPivot() or door.CFrame

        local interrupted = CombatEngine.InterruptableStall(0.5, function()
            -- Interrupsi ditambahkan pengecekan SelectedWorld
            return not EngineConfig.AutoFarmActive or anyActiveTargetExists() or checkVictoryUi() or WORLD_INDEX[EngineConfig.SelectedWorld] ~= 1
        end)
        if interrupted or anyActiveTargetExists() or WORLD_INDEX[EngineConfig.SelectedWorld] ~= 1 then
            myHum.PlatformStand = false; return
        end
    end

    local centerPosition = myHRP.Position
    local steps = 50
    local orbitTiers = {50, 150, 250}

    for tierIndex, currentRadius in ipairs(orbitTiers) do
        if anyActiveTargetExists() or not EngineConfig.AutoFarmActive or checkVictoryUi() or WORLD_INDEX[EngineConfig.SelectedWorld] ~= 1 then break end
        print("[SYSTEM W1] Executing Orbit Tier " .. tierIndex .. " with Radius: " .. currentRadius)

        local lastOrbitCFrame = nil
        for i = 1, steps do
            -- Interrupsi instan di dalam loop pergerakan derajat orbit
            if not EngineConfig.AutoFarmActive or anyActiveTargetExists() or checkVictoryUi() or WORLD_INDEX[EngineConfig.SelectedWorld] ~= 1 then break end

            local angle = (i / steps) * (math.pi * 2)
            local targetPos = centerPosition + Vector3.new(math.cos(angle) * currentRadius, 0, math.sin(angle) * currentRadius)

            CombatEngine.ResetPhysics(myHRP)
            lastOrbitCFrame = CFrame.new(targetPos, centerPosition)
            myHRP.CFrame = lastOrbitCFrame
            Services.RunService.Heartbeat:Wait()
        end

        if lastOrbitCFrame then
            local orbitStalled = CombatEngine.InterruptableStall(2, function()
                if not EngineConfig.AutoFarmActive or anyActiveTargetExists() or checkVictoryUi() or WORLD_INDEX[EngineConfig.SelectedWorld] ~= 1 then return true end
                CombatEngine.ResetPhysics(myHRP)
                myHRP.CFrame = lastOrbitCFrame
            end)
            if orbitStalled or anyActiveTargetExists() or WORLD_INDEX[EngineConfig.SelectedWorld] ~= 1 then break end
        end
    end

    if anyActiveTargetExists() or not EngineConfig.AutoFarmActive or checkVictoryUi() or WORLD_INDEX[EngineConfig.SelectedWorld] ~= 1 then
        myHum.PlatformStand = false; return
    end

    local finalCFrame = myHRP.CFrame
    local isInterrupted = CombatEngine.InterruptableStall(5, function()
        if not EngineConfig.AutoFarmActive or anyActiveTargetExists() or checkVictoryUi() or WORLD_INDEX[EngineConfig.SelectedWorld] ~= 1 then return true end
        CombatEngine.ResetPhysics(myHRP)
        myHRP.CFrame = finalCFrame
    end)
    if isInterrupted or anyActiveTargetExists() or WORLD_INDEX[EngineConfig.SelectedWorld] ~= 1 then
        myHum.PlatformStand = false; return
    end

    local portal = Navigation.GetClosestObject("RoundDoor", "Portal", myHRP.Position)
        or Navigation.GetClosestObject("Workspace", "Portal", myHRP.Position)
    if portal then
        CombatEngine.ResetPhysics(myHRP)
        myHRP.CFrame = portal:IsA("Model") and portal:GetPivot() or portal.CFrame

        local portalCFrame = myHRP.CFrame
        CombatEngine.InterruptableStall(3, function()
            if not EngineConfig.AutoFarmActive or anyActiveTargetExists() or checkVictoryUi() or WORLD_INDEX[EngineConfig.SelectedWorld] ~= 1 then return true end
            CombatEngine.ResetPhysics(myHRP)
            myHRP.CFrame = portalCFrame
        end)
        if anyActiveTargetExists() or not EngineConfig.AutoFarmActive or WORLD_INDEX[EngineConfig.SelectedWorld] ~= 1 then
            myHum.PlatformStand = false; return
        end
    end

    -- Idle stall 115 detik menunggu respawn
    if EngineConfig.AutoFarmActive and not anyActiveTargetExists() and WORLD_INDEX[EngineConfig.SelectedWorld] == 1 then
        local idleCFrame = myHRP.CFrame
        CombatEngine.InterruptableStall(115, function()
            if not EngineConfig.AutoFarmActive or anyActiveTargetExists() or checkVictoryUi() or WORLD_INDEX[EngineConfig.SelectedWorld] ~= 1 then return true end
            CombatEngine.ResetPhysics(myHRP)
            myHRP.CFrame = idleCFrame
        end)
    end
    myHum.PlatformStand = false
end

-- ── World 2 (Frozen Valley): stall → PortalD → Portal → idle ──
function Navigation.SearchWorld2(myHRP, myHum)
    if WORLD_INDEX[EngineConfig.SelectedWorld] ~= 2 then return end

    EngineConfig.IsLockDelay = true
    myHum.PlatformStand = true

    local function globalBreakCondition()
        return not EngineConfig.AutoFarmActive or anyActiveTargetExists() or checkVictoryUi() or WORLD_INDEX[EngineConfig.SelectedWorld] ~= 2
    end

    if CombatEngine.InterruptableStall(3, globalBreakCondition) then EngineConfig.IsLockDelay = false; myHum.PlatformStand = false; return end

    local portalDCF = Navigation.GetSingleClosestPortal("PortalD", myHRP.Position, 2)
    if portalDCF and not globalBreakCondition() then
        CombatEngine.ResetPhysics(myHRP)
        myHRP.CFrame = portalDCF
        task.wait(0.1)
    end

    if CombatEngine.InterruptableStall(3, globalBreakCondition) then EngineConfig.IsLockDelay = false; myHum.PlatformStand = false; return end
    if anyActiveTargetExists() or WORLD_INDEX[EngineConfig.SelectedWorld] ~= 2 then EngineConfig.IsLockDelay = false; myHum.PlatformStand = false; return end

    if CombatEngine.InterruptableStall(3, globalBreakCondition) then EngineConfig.IsLockDelay = false; myHum.PlatformStand = false; return end

    local portalCF = Navigation.GetSingleClosestPortal("Portal", myHRP.Position, 2)
    if portalCF and not globalBreakCondition() then
        CombatEngine.ResetPhysics(myHRP)
        myHRP.CFrame = portalCF
        task.wait(0.1)
    end

    if CombatEngine.InterruptableStall(3, globalBreakCondition) then EngineConfig.IsLockDelay = false; myHum.PlatformStand = false; return end

    EngineConfig.IsLockDelay = false
    if anyActiveTargetExists() or not EngineConfig.AutoFarmActive or WORLD_INDEX[EngineConfig.SelectedWorld] ~= 2 then
        myHum.PlatformStand = false; return
    end

    -- Idle stall 115 detik
    if EngineConfig.AutoFarmActive and not anyActiveTargetExists() and WORLD_INDEX[EngineConfig.SelectedWorld] == 2 then
        EngineConfig.IsLockDelay = true
        CombatEngine.InterruptableStall(115, function()
            if globalBreakCondition() then return true end
            CombatEngine.ResetPhysics(myHRP)
        end)
        EngineConfig.IsLockDelay = false
    end
    myHum.PlatformStand = false
end

-- ── World 3 (Oathlost Castle): stall → Portal dinamis → idle ──
function Navigation.SearchWorld3(myHRP, myHum)
    if WORLD_INDEX[EngineConfig.SelectedWorld] ~= 3 then return end

    EngineConfig.IsLockDelay = true
    myHum.PlatformStand = true

    local function globalBreakCondition()
        return not EngineConfig.AutoFarmActive or anyActiveTargetExists() or checkVictoryUi() or WORLD_INDEX[EngineConfig.SelectedWorld] ~= 3
    end

    if CombatEngine.InterruptableStall(3, globalBreakCondition) then EngineConfig.IsLockDelay = false; myHum.PlatformStand = false; return end

    local closestPortalCF = Navigation.GetSingleClosestPortal("Portal", myHRP.Position, 3)
    if closestPortalCF and not globalBreakCondition() then
        CombatEngine.ResetPhysics(myHRP)
        myHRP.CFrame = closestPortalCF
        task.wait(0.1)
    end

    if CombatEngine.InterruptableStall(3, globalBreakCondition) then EngineConfig.IsLockDelay = false; myHum.PlatformStand = false; return end

    EngineConfig.IsLockDelay = false
    if anyActiveTargetExists() or not EngineConfig.AutoFarmActive or WORLD_INDEX[EngineConfig.SelectedWorld] ~= 3 then
        myHum.PlatformStand = false; return
    end

    -- Idle stall 115 detik
    if EngineConfig.AutoFarmActive and not anyActiveTargetExists() and WORLD_INDEX[EngineConfig.SelectedWorld] == 3 then
        EngineConfig.IsLockDelay = true
        CombatEngine.InterruptableStall(115, function()
            if globalBreakCondition() then return true end
            CombatEngine.ResetPhysics(myHRP)
        end)
        EngineConfig.IsLockDelay = false
    end
    myHum.PlatformStand = false
end


--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
-- Export ke Hub
--------------------------------------------------------------------------------
H.Navigation            = Navigation
H.anyActiveTargetExists = anyActiveTargetExists
