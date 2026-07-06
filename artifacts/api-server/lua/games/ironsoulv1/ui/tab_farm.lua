--------------------------------------------------------------------------------
--// ui/tab_farm.lua — S17 Tab 1: Main Farm
--------------------------------------------------------------------------------
local H               = getgenv().Hub
local EngineConfig    = H.EngineConfig
local WORLD_NAMES     = H.WORLD_NAMES
local POSITION_MODES  = H.POSITION_MODES
local GameLists       = H.GameLists
local startFarmLoop   = H.startFarmLoop
local checkVictoryUi  = H.checkVictoryUi
local DisableAutoFarm = H.DisableAutoFarm
local CombatEngine    = H.CombatEngine
local CustomNotify    = H.CustomNotify
local CreateTab         = H.CreateTab
local CreateSection     = H.CreateSection
local CreateToggleUI    = H.CreateToggleUI
local CreateCycleUI     = H.CreateCycleUI
local CreateDropdownUI  = H.CreateDropdownUI
local CreateButton      = H.CreateButton
local CreateInputUI     = H.CreateInputUI
local CreateMultiCheckUI = H.CreateMultiCheckUI

-- [S17] TAB 1 — MAIN FARM
--------------------------------------------------------------------------------
local MainFarmPage = CreateTab("🏠 Farm", "tabFarm")

CreateSection(MainFarmPage, "World", "secWorld")
_G.WorldDropdown = CreateCycleUI(MainFarmPage, "🌍 World", WORLD_NAMES, EngineConfig.SelectedWorld, function(v)
    EngineConfig.SelectedWorld = v
end)

CreateSection(MainFarmPage, "Farm Engine Control", "secFarmEngine")

_G.AutoFarmToggle = CreateToggleUI(MainFarmPage, "🌾 Auto Farm", EngineConfig.AutoFarmActive, function(v)
    EngineConfig.AutoFarmActive = v
    if v then
        if checkVictoryUi() then task.spawn(function() DisableAutoFarm("Victory aktif.") end)
        else task.spawn(startFarmLoop) end
    end
end, "lblAutoFarm")
-- Daftarkan ke combat.lua agar DisableAutoFarm bisa reset toggle lewat H.SetToggleControl
if H.SetToggleControl then H.SetToggleControl(_G.AutoFarmToggle) end

local _farmTargetApis = CreateMultiCheckUI(
    MainFarmPage,
    "Auto Farm Target  (aktif saat Auto Farm ON)",
    {"🗡️ Monster", "📦 Chest", "🥚 Egg"},
    {EngineConfig.FarmTargetMonster, EngineConfig.FarmTargetChest, EngineConfig.FarmTargetEgg},
    {
        function(v) EngineConfig.FarmTargetMonster = v end,
        function(v) EngineConfig.FarmTargetChest = v end,
        function(v) EngineConfig.FarmTargetEgg = v end,
    }
)
_G.TargetMonsterToggle = _farmTargetApis[1]
_G.TargetChestToggle   = _farmTargetApis[2]
_G.TargetEggToggle     = _farmTargetApis[3]

CreateSection(MainFarmPage, "Metode & Posisi Gerakan", "secMethodPos")
_G.FarmMethodDropdown   = CreateCycleUI(MainFarmPage, "Metode", {"CFrame","Lerp"}, EngineConfig.FarmMethod, function(v) EngineConfig.FarmMethod = v end)
_G.FarmPositionDropdown = CreateDropdownUI(MainFarmPage, "Posisi Farm", POSITION_MODES, EngineConfig.FarmPosition, function(v) EngineConfig.FarmPosition = v end, "lblPosition")

CreateSection(MainFarmPage, "Skill Config", "secSkillCfg")

_G.AutoAttackOnlyToggle = CreateToggleUI(MainFarmPage, "⚡ Kill Aura", EngineConfig.AutoAttackOnly, function(v) EngineConfig.AutoAttackOnly = v end, "lblKillAura")
_G.AutoSkillToggle      = CreateToggleUI(MainFarmPage, "🎯 Enable Auto Skill", EngineConfig.AutoSkillActive, function(v)
    EngineConfig.AutoSkillActive = v; if v then CustomNotify("⚔️ SKILL","Auto Skill AKTIF!",2) end
end, "lblAutoSkill")

local _skillApis = CreateMultiCheckUI(
    MainFarmPage,
    "Skill Aktif  (bisa pilih lebih dari 1)",
    {"Skill 1","Skill 2","Skill U"},
    {EngineConfig.SkillActive1, EngineConfig.SkillActive2, EngineConfig.SkillActiveU},
    {
        function(v) EngineConfig.SkillActive1 = v end,
        function(v) EngineConfig.SkillActive2 = v end,
        function(v) EngineConfig.SkillActiveU = v end,
    }
)
_G.SkillActive1Toggle = _skillApis[1]
_G.SkillActive2Toggle = _skillApis[2]
_G.SkillActiveUToggle = _skillApis[3]

CreateSection(MainFarmPage, "Weapon Switcher", "secWeapon")
_G.AutoSwitchToggle = CreateToggleUI(MainFarmPage, "🎒 Auto Weapon Switcher (3s)", EngineConfig.AutoWeaponSwitchActive, function(v)
    EngineConfig.AutoWeaponSwitchActive = v; if v then CustomNotify("🎒 WEAPON","Switcher AKTIF!",2) end
end, "lblWeaponSwitch")

CreateSection(MainFarmPage, "Utilities", "secUtils")
_G.ReplayToggle = CreateToggleUI(MainFarmPage, "🔄 Auto Play Again", EngineConfig.AutoReplayActive, function(v) EngineConfig.AutoReplayActive = v end, "lblAutoReplay")

-- Auto Return to Lobby
-- • Auto Replay ON + Auto Return ON → Replay dulu, 30 detik kemudian BackLobby
-- • Auto Return ON saja              → Langsung BackLobby setelah Settlement
_G.AutoReturnLobbyToggle = CreateToggleUI(MainFarmPage, "🏠 Auto Return to Lobby", EngineConfig.AutoReturnLobbyActive, function(v)
    EngineConfig.AutoReturnLobbyActive = v
    if v then
        if EngineConfig.AutoReplayActive then
            CustomNotify("🏠 RETURN+REPLAY","Replay → 30 detik → kembali lobby",3)
        else
            CustomNotify("🏠 AUTO RETURN","Akan otomatis kembali lobby saat ronde selesai",3)
        end
    end
end, "lblAutoReturn")

local _AUTOEXEC_CODE = 'loadstring(game:HttpGet("https://xifil-hub-beta-production.up.railway.app/api/lua/loader?game=soul_iron"))()'
local _queue_teleport = queue_on_teleport or queueonteleport or (syn and syn.queue_on_teleport)
_G.AutoExecuteToggle = CreateToggleUI(MainFarmPage, "⚡ Auto Exec on Server Hop/Rejoin", EngineConfig.AutoExecuteOnRejoin, function(state)
    EngineConfig.AutoExecuteOnRejoin = state
    if state then
        if _queue_teleport then
            _queue_teleport(_AUTOEXEC_CODE)
            CustomNotify("⚡ AUTO EXEC AKTIF","Script akan otomatis jalan saat pindah server/rejoin.",4)
        else
            CustomNotify("❌ GAGAL","Executor kamu tidak mendukung queue_on_teleport.",4)
        end
    else CustomNotify("⚠️ INFO","Auto Execute dimatikan. Efektif setelah restart game.",4) end
end, "lblAutoExec")


--------------------------------------------------------------------------------
