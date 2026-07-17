--------------------------------------------------------------------------------
--// core.lua — S01 Services + S02 Engine Config & Konstanta
--------------------------------------------------------------------------------
local H = getgenv().Hub

-- [S01] SERVICES & REMOTES
--------------------------------------------------------------------------------
local Services = setmetatable({}, {
    __index = function(self, key)
        local s = game:GetService(key)
        if s then self[key] = s end; return s
    end
})

local LocalPlayer  = Services.Players.LocalPlayer
local Workspace    = Services.Workspace
local TweenService = Services.TweenService

local PlayerActionRE = Services.ReplicatedStorage:WaitForChild("Remotes"):WaitForChild("PlayerActionRE")
local GameRoundRE    = Services.ReplicatedStorage:WaitForChild("Remotes"):WaitForChild("GameRoundRE")
local EquipmentRE    = Services.ReplicatedStorage:WaitForChild("Framework"):WaitForChild("Gameplay"):WaitForChild("EquipmentSystem"):WaitForChild("EquipmentRE")
local ForgeRF        = Services.ReplicatedStorage:WaitForChild("Framework"):WaitForChild("Features"):WaitForChild("ForgeSystem"):WaitForChild("ForgeRF")
local MaterialRE     = Services.ReplicatedStorage:WaitForChild("Framework"):WaitForChild("Gameplay"):WaitForChild("EquipmentSystem"):WaitForChild("MaterialUtil"):WaitForChild("RemoteEvent")
local WorldPlaceRE   = Services.ReplicatedStorage:WaitForChild("Framework"):WaitForChild("Gameplay"):WaitForChild("WorldPlace"):WaitForChild("WorldUtil"):WaitForChild("RemoteEvent")
local GameMatchRE    = Services.ReplicatedStorage:WaitForChild("Remotes"):WaitForChild("GameMatchRE")


--------------------------------------------------------------------------------
-- [S02] ENGINE CONFIG & KONSTANTA
--------------------------------------------------------------------------------

local WORLD_NAMES = { "Starless Forest", "Frozen Valley", "Oathlost Castle", "Tartarus" }
local WORLD_INDEX = { ["Starless Forest"]=1, ["Frozen Valley"]=2, ["Oathlost Castle"]=3, ["Tartarus"]=4 }

local POSITION_MODES = {
    "Orbit Atas", "Orbit Bawah", "Orbit Samping",
    "Diam Atas",  "Diam Bawah",  "Depan Target",
    "Belakang Target", "Acak",
}

local ROOM_WORLD_DISPLAY = {
    "Starless Forest", "Frozen Valley", "Oathlost Castle", "Tartarus",
    "Cave of Crystal", "Cave of Runes", "Abandoned Courtyard",
    "Endless Tower",
}
local ROOM_WORLD_KEY = {
    ["Starless Forest"]     = "World1",
    ["Frozen Valley"]       = "World2",
    ["Oathlost Castle"]     = "World3",
    ["Tartarus"]            = "World4",
    ["Cave of Crystal"]     = "Cave1",
    ["Cave of Runes"]       = "Cave2",
    ["Abandoned Courtyard"] = "Cave3",
    ["Endless Tower"]       = "Endless1",
}
local function isCaveWorld(displayName)
    return displayName == "Cave of Crystal"
        or displayName == "Cave of Runes"
        or displayName == "Abandoned Courtyard"
end
local function isEndlessTower(displayName)
    return displayName == "Endless Tower"
end

local MODE_NAMES = {
    [1]="Trial", [2]="Challenge", [3]="Penitent", [4]="Torment", [5]="Inferno",
    [6]="Trial", [7]="Challenge", [8]="Penitent", [9]="Torment",[10]="Inferno",
}
local function getModeLabel(n) return n.." - "..(MODE_NAMES[n] or tostring(n)) end

local EngineConfig = {
    AutoFarmActive    = false,
    FarmTargetMonster = false,
    FarmTargetChest   = false,
    FarmTargetEgg     = false,
    AutoAttackOnly    = false,
    AutoReplayActive  = false,
    SelectedWorld     = "Starless Forest",
    FarmMethod   = "CFrame",
    FarmPosition = "Orbit Atas",
    LerpAlpha    = 0.3,
    StandHeight   = 20,
    BossHeight    = 25,
    OrbitRadius   = 12,
    OrbitSpeed    = 5,
    CFrameDelay   = 0.001,
    HitMultiplier = 1,
    IsLockDelay   = false,
    AutoSkillActive    = false,
    SkillActive1       = true,
    SkillActive2       = true,
    SkillActiveU       = true,
    SkillCooldownDelay = 0.5,
    AutoWeaponSwitchActive = false,
    SelectedNormalNpcId = nil,
    SelectedBossNpcId   = nil,
    SellCategory       = "All",
    AutoSellStaticList = {},
    AutoBuyActive     = false,
    AutoBuyTargetList = {},
    RoomWorldDisplay = "Starless Forest",
    RoomModeType     = "Normal",
    RoomMode         = 1,
    RoomPlayers      = 4,
    RoomTarget       = "Room1",
    ForgeQTEBase          = 1,
    ForgeQTEMultiplier    = 1,
    ForgeFinishBase       = 1,
    ForgeFinishMultiplier = 1,
    ForgeResultBase       = 1,
    ForgeResultMultiplier = 1,
    AntiAFKActive    = false,
    AntiPausedActive = false,
    AutoExecuteOnRejoin   = false,
    AutoReturnLobbyActive = false,
    FriendOnlyRoom        = true,
    AutoJoinRoomActive    = false,
    SellByRarityActive   = false,
    SellByRarityInterval = 3,
    -- Semua key disimpan eksplisit (false, bukan nil) agar JSON encode/decode
    -- selalu menyertakan semua 6 rarity → save/load visual pill bekerja benar.
    SellByRarityList     = {
        Common=false, Uncommon=false, Rare=false,
        Epic=false, Legendary=false, Mythical=false,
    },
    -- ── Utilitas Tab ──────────────────────────────────────────────────────
    -- Kunci disimpan eksplisit agar JSON encode/decode selalu lengkap.
    UtilSelectedCodes    = {},   -- map: codeName → bool (kode mana yang dipilih)
    UtilLotteryCount     = 15,   -- jumlah reroll lottery sekaligus
    UtilAutoRerollActive = false, -- toggle auto reroll race
    UtilRaceSlot         = 1,    -- slot race yang di-reroll (1–6)
    UtilTargetRaces      = {},   -- map: raceName → bool (target race yg dicari)
}

local GameLists = { NormalNPCs = {"None"}, BossNPCs = {"None"} }


--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
-- Export ke Hub
--------------------------------------------------------------------------------
H.Services       = Services
H.LocalPlayer    = LocalPlayer
H.Workspace      = Workspace
H.TweenService   = TweenService
H.PlayerActionRE = PlayerActionRE
H.GameRoundRE    = GameRoundRE
H.EquipmentRE    = EquipmentRE
H.ForgeRF        = ForgeRF
H.MaterialRE     = MaterialRE
H.WorldPlaceRE   = WorldPlaceRE
H.GameMatchRE    = GameMatchRE
H.EngineConfig   = EngineConfig
H.GameLists      = GameLists
H.WORLD_NAMES    = WORLD_NAMES
H.WORLD_INDEX    = WORLD_INDEX
H.POSITION_MODES = POSITION_MODES
H.ROOM_WORLD_DISPLAY = ROOM_WORLD_DISPLAY
H.ROOM_WORLD_KEY     = ROOM_WORLD_KEY
H.MODE_NAMES         = MODE_NAMES
H.isCaveWorld        = isCaveWorld
H.isEndlessTower     = isEndlessTower
H.getModeLabel       = getModeLabel
