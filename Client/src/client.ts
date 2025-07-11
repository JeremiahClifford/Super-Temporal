//----------------------------------------------
//--------------Tunable Values------------------
//----------------------------------------------

//#region Tunable Values
let numPlanets: number = 5 // number of planets that the game should have
let numTimePeriods: number = 10 // stores how many time periods each planet should have

let maxModifierFactor: number = 0.05 // how high should the variance between time periods be allowed to get
let baseResourceProduction: number = 10 // base number of resource generation that each time period generates
let resourceRateAdjuster: number = 10 // number that the inverted modifier is multiplied by to make the differences between the resource production of different time periods substantial
let warehouseBonusPercent: number = 0.05 // percent added to one of increase of resources if time period has a warehouse
let resourceGenPropagates: boolean = false // should resources added to a time period by normal resource gen propagate. Added because in testing, resource numbers got out of control

let gameBackgroundColor: string = "#03053c" // background color of the whole game
let boardBackgroundColor: string = "#e8e8e8" // color of the background of the various boards
let boardOutlineColor: string = "#2c2c2c" // color of the outline of the various boards
let buttonBackgroundColor: string = "rgba(200, 200, 200, 0.7)" // background color of selected or hovered buttons
let warColor: string = " #d95f5f" // color of the war flag when its war
let paxColor: string = " #81d95f" // color of the war flag when its peace

let trainTroopCost: number = 0 // how many resources should it cost to train a troop
let latenessFactor: number = 0.5 // by what factor should later time period resources be reduced

let darkAges: boolean = false // should dark ages be in play and affect power values

let troopTrainBaseTime: number = 3 // how long it takes to train a troop by default
let trainingCampDiscount: number = 1 // how many turns the training camp reduces troop training by
let healthRecoveryPercent: number = 0.1 // how much health do troops recover per turn
let fortressProtectionPercent: number = 0.8 // how much damage do troops take if they are in a fortress

let buildingCost: number = 500 // how much it costs to build a building
let buildingTime: number = 5 // how many turns it takes to build a building

const playerColors: string[] = [ // colors to represent the players [14]
    " #80e0ff ",
    " #cfff80 ",
    " #80ffa5 ",
    " #f480ff ",
    " #9780ff ",
    " #ffa380 ",
    " #80c1ff ",
    " #c280ff ",
    " #92ff80 ",
    " #ffd680 ",
    " #ff7d7d ",
    " #808dff ",
    " #ffbf80 ",
    " #80ffd0 "
]
//#endregion Tunable Values

//----------------------------------------------
//--------------Helper Functions----------------
//----------------------------------------------

//#region Helper Functions
const SortTroops = (ta: Troop[]): Troop[] => { //sorts the troops of an army in descending order of power
    return ta.sort((a, b) => { //uses the built in sort method
        return (b.n_level + b.n_modifier) - (a.n_level + a.n_modifier)
    })
}

const CleanArmies = (): void => { // loops through every time zone and removes any empty time zones. runs every time the game draw
    for (let i: number = 0; i < pa_planets.length; i++) { //loops through all of the planets
        for (let j: number = 0; j < pa_planets[i].ta_timePeriods.length; j++) { //loops through all of the time periods
            for (let k: number = 0; k < pa_planets[i].ta_timePeriods[j].aa_armies.length; k++) { //loops through all of the armies
                if (pa_planets[i].ta_timePeriods[j].aa_armies[k].ta_troops.length === 0) { //checks if the army is empty
                    pa_planets[i].ta_timePeriods[j].aa_armies = pa_planets[i].ta_timePeriods[j].aa_armies.filter((a) => a.ta_troops.length !== 0) //if so: removes it
                }
            }
        }
    }
}

const TroopsString = (a: Army, useName: boolean): string => { // gives a string representation of the player's or time period's list of troops
    a.ta_troops = SortTroops(a.ta_troops) // sorts the troops so they are in a good order to be printed

    // squashes troops of the same level into 1 line
    type troopType = {
        n_level: number
        n_health: number
        n_count: number
    }
    let troopTypes: troopType[] = []
    let found: boolean = false

    for (let i: number = 0; i < a.ta_troops.length; i++) { // loops through the army
        found = false
        for (let j: number = 0; j < troopTypes.length; j++) { // loops through the saved troop types
            if (troopTypes[j].n_level === (a.ta_troops[i].n_level + a.ta_troops[i].n_modifier) && troopTypes[j].n_health === a.ta_troops[i].n_health) { //checks if the troop type matches
                troopTypes[j].n_count++ // if so: increment the count
                found = true
            }
        }
        if (!found) { // if not: add new type to the list
            troopTypes.push({
                n_level: a.ta_troops[i].n_level + a.ta_troops[i].n_modifier,
                n_health: a.ta_troops[i].n_health,
                n_count: 1
            })
        }
    }

    // find the total level and health of the army
    let totalLevel: number = 0
    let totalHealth: number = 0
    a.ta_troops.forEach((t) => {
        totalLevel += (t.n_level + t.n_modifier)
        totalHealth += t.n_health
    })

    let output: string = ``
    if (useName) { // if this use case requires the name of the owner to distinguish, add the name of the owner. only really used on the selected time period display as multiple armies owned by multiple players can appear there
        if (a.n_ownerIndex === -1) {
            output = `Natives ` //adds the header to the output showing how many total troops the army has and the owner
        } else {
            output = `${pa_players[a.n_ownerIndex].s_name} ` //adds the header to the output showing how many total troops the army has and the owner
        }
    }
    output += `[${a.ta_troops.length} Battalions(s) | L: ${Math.round(totalLevel * 100) / 100} | S: ${Math.round(totalHealth * 100) / 100}]:<br>` //adds th e number of troops
    for (let i: number = 0; i < troopTypes.length; i++) { //loops through the types
        output += `${troopTypes[i].n_count}x Level: ${troopTypes[i].n_level} | Strength: ${Math.round(troopTypes[i].n_health * 100) / 100}<br>` //adds a line of their info to the output string
    }
    return output // returns the outputted list
}

const TroopCardList = (a: Army, taken: boolean, target: Army): string => { //takes an army and returns a string which is a list of all the individual troops with controls which are used on the trade screen to move them back and forth. If taken is true that means this list goes in the selected box. If taken is false, it is going in the present box. This changes what the button s say
    let output: HTMLElement = document.createElement('div') as HTMLElement //creates the div for the list of troop cards
    output.className = 'troop-card-list' //gives the div a class

    for (let i: number = 0; i < a.ta_troops.length; i++) { //loops through all of the troops to give them each a card
        let troopCard: HTMLElement = document.createElement('div') as HTMLElement //creates the troop card for this troop
        troopCard.className = 'troop-card' //gives the troop card a class
        troopCard.innerHTML += `
                Level: ${a.ta_troops[i].n_level + a.ta_troops[i].n_modifier} Strength: ${Math.round(a.ta_troops[i].n_health * 100) / 100}
        ` //adds the level of the troop to the troop card
        let selectButton: HTMLButtonElement = document.createElement('button') //creates the select button
        selectButton.className = 'swap-button'
        selectButton.id = `${taken}-${a.n_ownerIndex}-swap-button-${i}-${target.n_ownerIndex}`
        if (taken) { //adds the text to the button depending on wether it is selected or not
            selectButton.innerHTML = `Deselect`
        } else {
            selectButton.innerHTML = `Select`
        }
        troopCard.appendChild(selectButton) //adds the button the to troop card
        output.appendChild(troopCard) //adds the troop card to the list
    }

    return output.outerHTML //returns the generated HTML
}
//#endregion Helper Functions

//----------------------------------------------
//--------Classes and Enums and Types-----------
//----------------------------------------------

//#region Types
type TurnActionsObject = {
    Header: {
        CurrentTurnIndex: number,
        GameID: number,
        TurnNumber: number
    },
    Actions: any[]
}
//#endregion Types

//#region Enums
enum BuildingType {
    Training_Camp = 0, //makes training troops faster
    Warehouse = 1, //increases resource production (thematically reduces resource losses to spoilage)
    Fortress = 2 //gives bonus to defending troops
}
//#endregion Enums

//#region Classes
class Player {

    s_name: string
    a_troops: Army
    n_resources: number
    na_location: number[]

    n_remainingMoves: number
    n_remainingTrades: number

    b_hasSubmitted: boolean

    constructor (c_index: number, c_name: string) {
        this.s_name = c_name
        this.a_troops = new Army(c_index, [])
        this.n_resources = 0
        this.na_location = [-1, -1]

        this.n_remainingMoves = 0
        this.n_remainingTrades = 0

        this.b_hasSubmitted = false
    }
}

class Troop { //represents 1 fighting unit

    n_rawLevel: number
    n_level: number
    n_modifier: number
    n_health: number
    n_id: number

    constructor (c_rawLevel: number, c_modifier: number, c_health: number = -1) {
        this.n_rawLevel = c_rawLevel
        this.n_level = Math.pow(2, this.n_rawLevel)
        this.n_modifier = c_modifier
        if (c_health === -1) {
            this.n_health = this.n_level + this.n_modifier
        } else {
            this.n_health = c_health
        }
        this.n_id = Math.random()
    }

    ToString = (): string => {
        return `Level: ${this.n_level + this.n_modifier}`
    }
}

class Army { //a group of fighting units as well a number to store which player owns it

    n_ownerIndex: number
    ta_troops: Troop[]

    constructor (c_ownerIndex: number, c_troops: Troop[]) {
        this.n_ownerIndex = c_ownerIndex
        this.ta_troops = c_troops
    }
}

class Building {

    s_name: string
    bt_type: BuildingType

    constructor (c_type: BuildingType, c_name: string = `default`) {
        this.bt_type = c_type
        this.s_name = c_name
        if (c_name === `default`) {
            switch (this.bt_type) {
                case 0:
                    this.s_name = `Training Camp`
                    break
                case 1:
                    this.s_name = `Warehouse`
                    break
                case 2:
                    this.s_name = `Fortress`
                    break
            }
        } else {
            this.s_name = c_name
        }
    }
}

class BuildOrder {

    tb_target: Troop | Building
    n_turnsRemaining: number

    constructor (c_target: Troop | Building, c_turns: number = 1) {
        this.tb_target = c_target
        this.n_turnsRemaining = c_turns
    }
}

class TimePeriod {

    n_ownerIndex: number
    n_rawLevel: number
    n_level: number
    n_rawModifierFactor: number //stores the raw generated value for the modifier factor which should be between 0 and ${maxModifierFactor} for testing purposes
    n_powerModifier: number
    n_resources: number
    n_resourceProduction: number
    n_darkAgeValue: number
    ba_buildings: Building[]
    aa_armies: Army[]
    boa_buildQueue: BuildOrder[]
    b_hasCombat: boolean
    b_propagationBlocked: boolean
    b_conquested: boolean
    b_scorchedEarth: boolean //resources will continue to propagate to conquested time periods, which will be propagation blocked, unless the time period before is set to scorched earth, i.e. the player has told the people to destroy the resources before they are conquested. this can lead to another player getting resources that you generate or losing resources that you take and thus don't leave behind but if you go scorched earth the time periods disconnect and the latter time period gets a fresh start resource-wise. Troops and buildings don't propagate as those would all be lost in the battle for control. Conquest propagation orders don't go for obvious reasons.

    constructor (c_level: number, c_modifierFactor: number, c_darkAgeValue: number) {
        this.n_ownerIndex = -1 //sets the owner to the natives
        this.n_rawLevel = c_level
        this.n_level = Math.pow(2, this.n_rawLevel)
        this.n_rawModifierFactor = c_modifierFactor
        this.n_powerModifier = c_modifierFactor * this.n_level
        if (darkAges) {
            this.n_powerModifier *= Math.abs(c_darkAgeValue) / 2
        }
        if (this.n_powerModifier < 1) { //truncates the troop power modifier to 2 decimals if less than zero or whole number if more than zero to keep things tidy
            this.n_powerModifier = Math.round(this.n_powerModifier * 100) *0.01
        } else {
            this.n_powerModifier = Math.round(this.n_powerModifier)
        }
        this.n_resourceProduction = baseResourceProduction * (1 + ((maxModifierFactor - c_modifierFactor) * resourceRateAdjuster)) - (c_level * latenessFactor) //sets the resource production bonus to the inverse of the troop power bonus to balance time periods that have good troops with lower resource production
        if (darkAges) {
            this.n_resourceProduction *= Math.abs(c_darkAgeValue) / 2
        }
        this.n_resourceProduction = Math.round(this.n_resourceProduction * 100) *0.01 //truncates the resource modifier to 2 decimals
        this.n_resources = this.n_resourceProduction * 5 //TEMP: starts the time period with 5 turns worth of resources. not sure what I want this to be in the final version
        this.n_darkAgeValue = c_darkAgeValue
        this.ba_buildings = []
        this.aa_armies = []
        this.boa_buildQueue = []
        this.b_hasCombat = false
        this.b_propagationBlocked = false
        this.b_conquested = false
        this.b_scorchedEarth = false
    }

    StartTroopTraining = (): void  => {
        this.ba_buildings.forEach((b) => { //check all buildings in this time period
            if (b.bt_type === 0) { //if there is a training camp
                this.boa_buildQueue.push(new BuildOrder(new Troop(this.n_rawLevel, this.n_powerModifier), troopTrainBaseTime - trainingCampDiscount)) //reduced training time
                return //and exit function
            }
        })
        this.boa_buildQueue.push(new BuildOrder(new Troop(this.n_rawLevel, this.n_powerModifier), troopTrainBaseTime)) //otherwise normal training time
    }

    StartBuilding = (p_type: number): void => {
        switch (p_type) {
            case 0:
                this.boa_buildQueue.push(new BuildOrder(new Building(0), buildingTime))
                break;
            case 1:
                this.boa_buildQueue.push(new BuildOrder(new Building(1), buildingTime))
                break;
            case 2:
                this.boa_buildQueue.push(new BuildOrder(new Building(2), buildingTime))
                break;
        }
    }
}

class Planet {

    s_name: string
    ta_timePeriods: TimePeriod[]

    constructor (c_name: string, c_darkAgePoint: number) {

        this.s_name = c_name

        //generate the time periods
        this.ta_timePeriods = []
        for (let i: number = 0; i < numTimePeriods; i++) { //creates the specified number of time periods for the planets
            this.ta_timePeriods.push(new TimePeriod(i, Math.random() * maxModifierFactor, i - c_darkAgePoint)) //creates all of the planets, providing the power level, the random modifier, and the dark age value
        }
    }
}
//#endregion Classes

//----------------------------------------------
//-----------Trading and Building---------------
//----------------------------------------------

//#region Trading
//holds onto the trading window elements
const tradingWindow: HTMLElement = document.getElementById('trading-window') as HTMLElement //the whole trading window
const timePeriodPresent: HTMLElement = document.getElementById('time-period-present') as HTMLElement //the box where the things in the time period go
const timePeriodForTrade: HTMLElement = document.getElementById('time-period-for-trade') as HTMLElement //box of the things that are coming from the time period
const playerPresent: HTMLElement = document.getElementById('player-present') as HTMLElement //the box where the things the player has go
const playerForTrade: HTMLElement = document.getElementById('player-for-trade') as HTMLElement //box of things the player is giving in the trade
const tradeCancelButton: HTMLButtonElement = document.getElementById('trade-window-cancel-button') as HTMLButtonElement //cancel button
const tradeSubmitButton: HTMLButtonElement = document.getElementById('trade-window-submit-button') as HTMLButtonElement //submit button

let resourcesGiven: number = 0
let resourcesTaken: number = 0
let troopsGiven: Army = new Army(-2, [])
let troopsTaken: Army = new Army(-3, [])

const FillInTradeWindow = (p: number, t: TimePeriod): void => { // function which writes everything that is in the trade. This function runs every time something is changed in the trade to update the UI

    tradingWindow.style.display = "block" // shows the trade window

    // fills in the time periods side
    // fills in the time period present
    // resets the text and adds a card for the resources in the time period
    if (t.n_ownerIndex === p) {
        timePeriodPresent.innerHTML = `
            <div class="resource-trade-card">
                <h4>Resources: ${(Math.round(t.n_resources * 100)) / 100}</h4>
                <input type="number" class="resource-select-input" id="time-period-present-resource-select-input">
                <button class="resource-select-button" id="time-period-present-resource-select-button" onclick="SwapResources(false, true, ${p})">Select</button>
            <div>
        `
    } else {
        timePeriodPresent.innerHTML = ``
    }
    let playerArmyIndex: number = -1 // the index at which the player's army in the time period is. -1 by default as they might not have an army
    for (let i: number = 0; i < t.aa_armies.length; i++) { // finds which army in the time period belongs to the player if any
        if (t.aa_armies[i].n_ownerIndex === p) {
            playerArmyIndex = i
        }
    }
    if (playerArmyIndex > -1) { // checks if the player has an army in the time period
        timePeriodPresent.innerHTML += TroopCardList(t.aa_armies[playerArmyIndex], false, troopsTaken)// if so: writes out the troops of that army
        for (let i = 0; i < t.aa_armies[playerArmyIndex].ta_troops.length; i++) { // gives the events to the buttons
            let selectButton: HTMLButtonElement = document.getElementById(`${false}-${p}-swap-button-${i}-${troopsTaken.n_ownerIndex}`) as HTMLButtonElement
            selectButton.addEventListener('click', () => {
                SwapTroop(t.aa_armies[playerArmyIndex], i, troopsTaken, true)
            })
        }
    } else {
        // if not: creates one to use. if not used, it will be cleaned next time the game draws
        t.aa_armies.push(new Army(p, []))
        playerArmyIndex = t.aa_armies.length - 1
    }
    // fills in the time period selected
    // resets the text and adds a card for the resources in the time period
    if (t.n_ownerIndex === p) {
        timePeriodForTrade.innerHTML = `
            <div class="resource-trade-card">
                <h4>Resources: ${(Math.round(resourcesTaken * 100)) / 100}</h4>
                <input type="number" class="resource-select-input" id="time-period-for-trade-resource-select-input">
                <button class="resource-select-button" id="time-period-for-trade-resource-select-button" onclick="SwapResources(false, false, ${p})">Select</button>
            <div>
        `
    } else {
        timePeriodForTrade.innerHTML = ``
    }
    timePeriodForTrade.innerHTML += TroopCardList(troopsTaken, true, t.aa_armies[playerArmyIndex])
    for (let i: number = 0; i < troopsTaken.ta_troops.length; i++) { // gives the events to the buttons
        let selectButton: HTMLButtonElement = document.getElementById(`${true}-${troopsTaken.n_ownerIndex}-swap-button-${i}-${p}`) as HTMLButtonElement
        selectButton.addEventListener('click', () => {
            SwapTroop(troopsTaken, i, t.aa_armies[playerArmyIndex], true)
        })
    }

    // fills in the player side
    // fills in the player present
    // resets the text and adds a card for the resources that the player has onboard
    if (t.n_ownerIndex === p) {
        playerPresent.innerHTML = `
            <div class="resource-trade-card">
                <h4>Resources: ${(Math.round(pa_players[p].n_resources * 100)) / 100}</h4>
                <input type="number" class="resource-select-input" id="player-present-resource-select-input">
                <button class="resource-select-button" id="player-present-resource-select-button" onclick="SwapResources(true, true, ${p})">Select</button>
            <div>
        `
    } else {
        playerPresent.innerHTML = ``
    }
    playerPresent.innerHTML += TroopCardList(pa_players[p].a_troops, false, troopsGiven)
    for (let i = 0; i < pa_players[p].a_troops.ta_troops.length; i++) { //gives the events to the buttons
        let selectButton: HTMLButtonElement = document.getElementById(`${false}-${p}-swap-button-${i}-${troopsGiven.n_ownerIndex}`) as HTMLButtonElement
        selectButton.addEventListener('click', () => {
            SwapTroop(pa_players[p].a_troops, i, troopsGiven, true)
        })
    }
    // fills in the player selected
    // resets the text and adds a card for the resources in the time period
    if (t.n_ownerIndex === p) {
        playerForTrade.innerHTML = `
            <div class="resource-trade-card">
                <h4>Resources: ${(Math.round(resourcesGiven * 100)) / 100}</h4>
                <input type="number" class="resource-select-input" id="player-for-trade-resource-select-input">
                <button class="resource-select-button" id="player-for-trade-resource-select-button" onclick="SwapResources(true, false, ${p})">Select</button>
            <div>
        `
    } else {
        playerForTrade.innerHTML = ``
    }
    
    playerForTrade.innerHTML += TroopCardList(troopsGiven, true, pa_players[p].a_troops)
    for (let i: number = 0; i < troopsGiven.ta_troops.length; i++) { //gives the events to the buttons
        let selectButton: HTMLButtonElement = document.getElementById(`${true}-${troopsGiven.n_ownerIndex}-swap-button-${i}-${p}`) as HTMLButtonElement
        selectButton.addEventListener('click', () => {
            SwapTroop(troopsGiven, i, pa_players[p].a_troops, true)
        })
    }
}

const CloseTradeWindow = (p: number, tp: TimePeriod): void => { // cancels a trade in progress and hides the window
    tradingWindow.style.display = "none" // hides the trade window
    pa_players[p].n_remainingTrades += 1 // gives the player their trade action back
    // moves all of the selected things back where they came from
    // returns the player's resources
    pa_players[p].n_resources += resourcesGiven
    resourcesGiven = 0
    // returns the time periods resources
    tp.n_resources += resourcesTaken
    resourcesTaken = 0
    // returns the player's troops and sorts their army
    troopsGiven.ta_troops.forEach((t) => pa_players[p].a_troops.ta_troops.push(t))
    pa_players[p].a_troops.ta_troops = SortTroops(pa_players[p].a_troops.ta_troops)
    troopsGiven.ta_troops = []
    // returns the time period's troops and sorts their army
    let playerArmyIndex: number = -1 // the index at which the player's army in the time period is. -1 by default as they might not have an army
    for (let i: number = 0; i < tp.aa_armies.length; i++) { // finds which army in the time period belongs to the player if any
        if (tp.aa_armies[i].n_ownerIndex === p) {
            playerArmyIndex = i
        }
    }
    if (playerArmyIndex > -1) { // checks if the player has an army in the time period
        // if so: returns the troops and sorts the army
        troopsTaken.ta_troops.forEach((t) => tp.aa_armies[playerArmyIndex].ta_troops.push(t))
        tp.aa_armies[playerArmyIndex].ta_troops = SortTroops(tp.aa_armies[playerArmyIndex].ta_troops)
        troopsTaken.ta_troops = []
    }

    CleanArmies()

    DrawBoard()
}

const SwapResources = (player: boolean, present: boolean, playerIndex: number): void => { // moves resources from one box to another
    if (player) { // if the swap should be in the player section
        if (present) { // if the swap should be from the present section to the selected section
            let numInput: HTMLInputElement = document.getElementById('player-present-resource-select-input') as HTMLInputElement
            if (numInput.value) { // makes sure that a number of resources is set by the player
                if (+numInput.value <= pa_players[playerIndex].n_resources ) { //makes sure the player can take more resources then there are
                    resourcesGiven += +numInput.value
                    pa_players[playerIndex].n_resources -= +numInput.value 
                } else {
                    resourcesGiven += pa_players[playerIndex].n_resources
                    pa_players[playerIndex].n_resources = 0
                }
            }
        } else { // if the swap should be from the selected section to the present section
            let numInput: HTMLInputElement = document.getElementById('player-for-trade-resource-select-input') as HTMLInputElement
            if (numInput.value) { // makes sure that a number of resources is set by the player
                if (+numInput.value <= resourcesGiven) { // makes sure the player can take more resources then there are
                    resourcesGiven -= +numInput.value
                    pa_players[playerIndex].n_resources += +numInput.value
                } else {
                    pa_players[playerIndex].n_resources += resourcesGiven
                    resourcesGiven = 0
                }
            }
        }
    } else {
        if (present) { // if the swap should be from the present section to the selected section
            let numInput: HTMLInputElement = document.getElementById('time-period-present-resource-select-input') as HTMLInputElement
            if (numInput.value) { //makes sure that a number of resources is set by the player
                if (+numInput.value <= pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_resources) { //makes sure the player can take more resources then there are
                    resourcesTaken += +numInput.value
                    pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_resources -= +numInput.value 
                } else {
                    resourcesGiven += pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_resources
                    pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_resources = 0
                }
            }
        } else { // if the swap should be from the selected section to the present section
            let numInput: HTMLInputElement = document.getElementById('time-period-for-trade-resource-select-input') as HTMLInputElement
            if (numInput.value) { //makes sure that a number of resources is set by the player
                if (+numInput.value <= resourcesTaken) { //makes sure the player can take more resources then there are
                    resourcesTaken -= +numInput.value
                    pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_resources += +numInput.value
                } else {
                    pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_resources += resourcesTaken
                    resourcesTaken = 0
                }
            }
        }
    }
    FillInTradeWindow(playerIndex, pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex]) //redraws the trade window
}

const SwapTroop = (start: Army, startIndex: number, target: Army, doUI: boolean): void => { // moves troops from one box to another
    target.ta_troops.push(start.ta_troops[startIndex]) // adds the troops to the target
    target.ta_troops = SortTroops(target.ta_troops) // sorts the target
    start.ta_troops = start.ta_troops.filter((t) => t !== start.ta_troops[startIndex]) // removes the troop from where it started
    if (doUI){
        FillInTradeWindow(myIndex, pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex]) // redraws the trade window
    }
}

const Trade = (p: number, tp: TimePeriod, p_pIndex: number, p_tIndex: number): void => { //function to move troops and resources between a player's ship and a time period given and taken are form the player's perspective. P is the index in pa_players of the player doing the trading
    tradingWindow.style.display = "none" // hides the trade window

    let playerArmyIndex: number = -1
    for (let i: number = 0; i < tp.aa_armies.length; i++) { // finds if the player already has an army in this time period
        if (tp.aa_armies[i].n_ownerIndex === p) {
            playerArmyIndex = i
        }
    }
    if (playerArmyIndex > -1) { // if they have an army here
        // Fill in the turn actions json for the trade
        turnActions.Actions.push({
            "Type": "Trade",
            "TargetTimePeriod": [p_pIndex, p_tIndex],
            "ResourcesTaken": resourcesTaken,
            "ResourcesGiven": resourcesGiven,
            "TroopsTaken": [],
            "TroopsGiven": []
        })
        // fill in the list of troops taken
        for (let i: number = 0; i < troopsTaken.ta_troops.length; i++) {
            turnActions.Actions[turnActions.Actions.length-1].TroopsTaken.push({
                "rawLevel": troopsTaken.ta_troops[i].n_rawLevel,
                "level": troopsTaken.ta_troops[i].n_level,
                "modifier": troopsTaken.ta_troops[i].n_modifier,
                "health": troopsTaken.ta_troops[i].n_health,
                "id": troopsTaken.ta_troops[i].n_id
            })
        }
        // fill in the list of troops given
        for (let i: number = 0; i < troopsGiven.ta_troops.length; i++) {
            turnActions.Actions[turnActions.Actions.length-1].TroopsGiven.push({
                "rawLevel": troopsGiven.ta_troops[i].n_rawLevel,
                "level": troopsGiven.ta_troops[i].n_level,
                "modifier": troopsGiven.ta_troops[i].n_modifier,
                "health": troopsGiven.ta_troops[i].n_health,
                "id": troopsGiven.ta_troops[i].n_id
            })
        }
        // swaps all the things around
        // gives the player the resources they take
        pa_players[p].n_resources += resourcesTaken
        resourcesTaken = 0
        // gives the time period the resources it has been given
        tp.n_resources += resourcesGiven
        resourcesGiven = 0
        // moves the taken troops to the player
        troopsTaken.ta_troops.forEach((t) => {
            pa_players[p].a_troops.ta_troops.push(t)
        })
        pa_players[p].a_troops.ta_troops = SortTroops(pa_players[p].a_troops.ta_troops)
        troopsTaken.ta_troops = []
        // moves the given troops to the time period
        troopsGiven.ta_troops.forEach((t) => {
            tp.aa_armies[playerArmyIndex].ta_troops.push(t)
        })
        tp.aa_armies[playerArmyIndex].ta_troops = SortTroops(tp.aa_armies[playerArmyIndex].ta_troops)
        troopsGiven.ta_troops = []
    } else { // if they don't have an army here
        // This should never happen as an empty army is created when the trade window is filled in if none is found
    }

    DrawBoard()
}

const TradeBetweenTurns = (tp: TimePeriod, rGiven: number, rTaken: number, tGiven: Troop[], tTaken: Troop[]): void => {
    console.log(`Trading`) // LOG:
            console.log(`  Troops Taken: ${JSON.stringify(tTaken)}`) // LOG:
            console.log(`  Troops Given: ${JSON.stringify(tGiven)}`) // LOG:
            console.log(`  Resources Taken: ${rTaken}`) // LOG:
            console.log(`  Resources Given: ${rGiven}`) // LOG:
    
    let playerArmyIndex: number = -1
    for (let i: number = 0; i < tp.aa_armies.length; i++) { // finds if the player already has an army in this time period
        if (tp.aa_armies[i].n_ownerIndex === myIndex) {
            playerArmyIndex = i
        }
    }

    if (playerArmyIndex === -1) {
        tp.aa_armies.push(new Army(myIndex, []))
        playerArmyIndex = tp.aa_armies.length - 1
    }

    pa_players[myIndex].n_resources += rTaken
    tp.n_resources += rGiven
    pa_players[myIndex].n_resources -= rGiven
    tp.n_resources -= rTaken
    
    for (let i: number = 0; i < tGiven.length; i++) {
        for (let j: number = 0; j < pa_players[myIndex].a_troops.ta_troops.length; j++) {
            if (
                pa_players[myIndex].a_troops.ta_troops[j].n_id === tGiven[i].n_id &&
                pa_players[myIndex].a_troops.ta_troops[j].n_rawLevel === tGiven[i].n_rawLevel &&
                pa_players[myIndex].a_troops.ta_troops[j].n_level === tGiven[i].n_level &&
                pa_players[myIndex].a_troops.ta_troops[j].n_modifier === tGiven[i].n_modifier &&
                pa_players[myIndex].a_troops.ta_troops[j].n_health === tGiven[i].n_health
            ) {
                console.log(`Troop Found`) //LOG:
                tp.aa_armies[playerArmyIndex].ta_troops.push(pa_players[myIndex].a_troops.ta_troops[j])
                tp.aa_armies[playerArmyIndex].ta_troops = SortTroops(tp.aa_armies[playerArmyIndex].ta_troops)
                pa_players[myIndex].a_troops.ta_troops = pa_players[myIndex].a_troops.ta_troops.filter((t) => t !== pa_players[myIndex].a_troops.ta_troops[j])
            }
        }
    }
    for (let i: number = 0; i < tTaken.length; i++) {
        for (let j: number = 0; j < tp.aa_armies[playerArmyIndex].ta_troops.length; j++) {
            if (
                tp.aa_armies[playerArmyIndex].ta_troops[j].n_id === tTaken[i].n_id &&
                tp.aa_armies[playerArmyIndex].ta_troops[j].n_rawLevel === tTaken[i].n_rawLevel &&
                tp.aa_armies[playerArmyIndex].ta_troops[j].n_level === tTaken[i].n_level &&
                tp.aa_armies[playerArmyIndex].ta_troops[j].n_modifier === tTaken[i].n_modifier &&
                tp.aa_armies[playerArmyIndex].ta_troops[j].n_health === tTaken[i].n_health
            ) {
                console.log(`Troop Found`) //LOG:
                pa_players[myIndex].a_troops.ta_troops.push(tp.aa_armies[playerArmyIndex].ta_troops[j])
                pa_players[myIndex].a_troops.ta_troops = SortTroops(pa_players[myIndex].a_troops.ta_troops)
                tp.aa_armies[playerArmyIndex].ta_troops = tp.aa_armies[playerArmyIndex].ta_troops.filter((t) => t !== tp.aa_armies[playerArmyIndex].ta_troops[j])
            }
        }
    }

    CleanArmies()
}
//#endregion Trading

//#region Building
// hold onto the building window elements
const buildingWindow: HTMLElement = document.getElementById('building-window') as HTMLElement //the whole building window

const FillInBuildWindow = (): void => {
    buildingWindow.style.display = "flex" //shows the build window

    let hasTrainingCamp: boolean = false
    let hasWarehouse: boolean = false
    let hasFortress: boolean = false

    pa_planets[pa_players[myIndex].na_location[0]].ta_timePeriods[pa_players[myIndex].na_location[1]].ba_buildings.forEach((b) => {
        if ((b.bt_type === 0) ? true : false) { // if the time periods already has a training camp
            hasTrainingCamp = true // set it to true
        }
        if ((b.bt_type === 1) ? true : false) { // if the time periods already has a warehouse
            hasWarehouse = true // set it to true
        }
        if ((b.bt_type === 2) ? true : false) { // if the time periods already has a fortress
            hasFortress = true // set it to true
        }
    })

    buildingWindow.innerHTML = `` // resets the build window buttons so they don't double up

    if (!hasTrainingCamp) { //creates the Training Camp button if there is not already a training camp
        let trainingCampButton: HTMLButtonElement = document.createElement('button')
        trainingCampButton.innerHTML = `Training Camp - [${buildingCost}]`
        trainingCampButton.addEventListener("click", () => {
            if (pa_planets[pa_players[myIndex].na_location[0]].ta_timePeriods[pa_players[myIndex].na_location[1]].n_resources >= buildingCost) { //checks to make sure there are enough resources
                pa_planets[pa_players[myIndex].na_location[0]].ta_timePeriods[pa_players[myIndex].na_location[1]].n_resources -= buildingCost //takes the cost
                pa_planets[pa_players[myIndex].na_location[0]].ta_timePeriods[pa_players[myIndex].na_location[1]].StartBuilding(0) //starts the building
                trainingCampButton.remove() //removes the button
                turnActions.Actions.push({
                    "Type": "Build",
                    "BuildingType": "0",
                    "Planet": n_selectedPlanetIndex,
                    "TimePeriod": n_selectedTimePeriodIndex
                }) // Add the build to the turn json
            }
        })
        buildingWindow.appendChild(trainingCampButton)
    }
    if (!hasWarehouse) { //creates the Warehouse button if there is not already a warehouse
        let warehouseButton: HTMLButtonElement = document.createElement('button')
        warehouseButton.innerHTML = `Warehouse - [${buildingCost}]`
        warehouseButton.addEventListener("click", () => {
            if (pa_planets[pa_players[myIndex].na_location[0]].ta_timePeriods[pa_players[myIndex].na_location[1]].n_resources >= buildingCost) { //checks to make sure there are enough resources
                pa_planets[pa_players[myIndex].na_location[0]].ta_timePeriods[pa_players[myIndex].na_location[1]].n_resources -= buildingCost //takes the cost
                pa_planets[pa_players[myIndex].na_location[0]].ta_timePeriods[pa_players[myIndex].na_location[1]].StartBuilding(1) //starts the building
                warehouseButton.remove() //removes the button
                turnActions.Actions.push({
                    "Type": "Build",
                    "BuildingType": "1",
                    "Planet": n_selectedPlanetIndex,
                    "TimePeriod": n_selectedTimePeriodIndex
                }) // Add the build to the turn json
            }
        })
        buildingWindow.appendChild(warehouseButton)
    }
    if (!hasFortress) { //creates the Fortress button if there is not already a fortress
        let fortressButton: HTMLButtonElement = document.createElement('button')
        fortressButton.innerHTML = `Fortress - [${buildingCost}]`
        fortressButton.addEventListener("click", () => {
            if (pa_planets[pa_players[myIndex].na_location[0]].ta_timePeriods[pa_players[myIndex].na_location[1]].n_resources >= buildingCost) { //checks to make sure there are enough resources
                pa_planets[pa_players[myIndex].na_location[0]].ta_timePeriods[pa_players[myIndex].na_location[1]].n_resources -= buildingCost //takes the cost
                pa_planets[pa_players[myIndex].na_location[0]].ta_timePeriods[pa_players[myIndex].na_location[1]].StartBuilding(2) //starts the building
                fortressButton.remove() //removes the button
                turnActions.Actions.push({
                    "Type": "Build",
                    "BuildingType": "2",
                    "Planet": n_selectedPlanetIndex,
                    "TimePeriod": n_selectedTimePeriodIndex
                }) // Add the build to the turn json
            }
        })
        buildingWindow.appendChild(fortressButton)
    }
    //create button to close menu
    let closeButton: HTMLButtonElement = document.createElement('button')
    closeButton.innerHTML = `Done`
    closeButton.addEventListener("click", () => CloseBuildWindow())
    buildingWindow.appendChild(closeButton)
}

const CloseBuildWindow = (): void => {
    buildingWindow.style.display = "none" //hides the build window

    buildingWindow.innerHTML = `` //clears out the buttons

    DrawBoard()
}
//#endregion Building

//----------------------------------------------
//-------------MAIN GAME LOGIC------------------
//----------------------------------------------

//#region Main Game Logic
let ip: string = `127.0.0.1`
let port: string = `4050`

let pa_players: Player[] = [] // stores the list of players in the game

let myIndex: number = 0 // stores which player the client is
let gameID: number // unique ID for the game you connect to, used to verify with the server
let turnNumber: number // stores the current turn number, used to verify with the server

let turnActions: TurnActionsObject = {
    Header: {
        CurrentTurnIndex: -1,
        GameID: 0,
        TurnNumber: -1
    },
    Actions: [
    ]
} // holds the actions that the player is taking this turn to be submitted

let pa_planets: Planet[] = [] // stores the list of the planets in play

//#region HTMLElements
// holds onto the time period board display
const timePeriodBoard: HTMLElement = document.getElementById('time-period-board') as HTMLElement

// holds onto the display for the selected time period and its parts
const selectedTimePeriodDisplay: HTMLElement = document.getElementById('selected-time-period-display') as HTMLElement // the whole display
const planetLine: HTMLElement = document.getElementById('planet-line') as HTMLElement // planet title
const ageLine: HTMLElement = document.getElementById('age-line') as HTMLElement // time period title
const ownerLine: HTMLElement = document.getElementById('owner-line') as HTMLElement // owner title
const powerLine: HTMLElement = document.getElementById('power-line') as HTMLElement // power level label
const resourcesLine: HTMLElement = document.getElementById('resources-line') as HTMLElement // resources line
const resourceProductionLine: HTMLElement = document.getElementById('resource-production-line') as HTMLElement // resource production line
const emptySection: HTMLElement = document.getElementById('empty-section') as HTMLElement // empty list section for when nothing is selected
const buildingSection: HTMLElement = document.getElementById('building-section') as HTMLElement // building list section
const buildingBox: HTMLElement = document.getElementById('building-list-box') as HTMLElement // box that holds list of buildings
const troopSection: HTMLElement = document.getElementById('troop-section') as HTMLElement // troop list section
const troopBox: HTMLElement = document.getElementById('troop-list-box') as HTMLElement // box that holds list of troops
const presentPlayersSection: HTMLElement = document.getElementById('present-players-section') as HTMLElement // present players list section
const presentPlayersBox: HTMLElement = document.getElementById('present-players-list-box') as HTMLElement // box that holds the list pf players in this time period
const controlSection: HTMLElement = document.getElementById('time-period-control-section') as HTMLElement // section with the controls for the time period owner
const buildBuildingsButton: HTMLButtonElement = document.getElementById('build-buildings-button') as HTMLButtonElement // button to open the building menu
const trainTroopButton: HTMLButtonElement = document.getElementById('train-troop-button') as HTMLButtonElement // button to train a troop
const scorchedEarthButton: HTMLButtonElement = document.getElementById('scorched-earth-button') as HTMLButtonElement // button for scorched earth
const buildQueueSection: HTMLElement = document.getElementById('build-queue-section') as HTMLElement // section for the build queue
const buildQueueBox: HTMLElement = document.getElementById('build-queue-list-box') as HTMLElement // list box of the build queue

// buttons to select which list you see on the selected time period display
const objectSectionSelectorSection: HTMLElement = document.getElementById('object-section-selector-section') as HTMLElement
const buildingsSectionSelectorButton: HTMLElement = document.getElementById('buildings-section-selector-button') as HTMLElement
const troopsSectionSelectorButton: HTMLElement = document.getElementById('troops-section-selector-button') as HTMLElement
const queueSectionSelectorButton: HTMLElement = document.getElementById('queue-section-selector-button') as HTMLElement
const playersSectionSelectorButton: HTMLElement = document.getElementById('players-section-selector-button') as HTMLElement
const controlsSectionSelectorButton: HTMLElement = document.getElementById('controls-section-selector-button') as HTMLElement

const playerListDisplay: HTMLElement = document.getElementById('player-list-display') as HTMLElement // the section which has the list of players
const playerListBox: HTMLElement = document.getElementById('player-list-box') as HTMLElement // the scrolling box that will show the list of players

// holds onto the display for the player's info
const currentPlayerInfoBox: HTMLElement = document.getElementById('player-info') as HTMLElement // the box that has the player's info
const turnSection: HTMLElement = document.getElementById('turn-section') as HTMLElement // the section for the current turn
const turnNumberSpot: HTMLElement = document.getElementById('turn-number-spot') as HTMLElement // the line for the turn number
const turnListSpot: HTMLElement = document.getElementById('turn-list-spot') as HTMLElement // the list of what the player has done this turn
const locationSpot: HTMLElement = document.getElementById('location-spot') as HTMLElement // the line for the players location
const resourceSpot: HTMLElement = document.getElementById('resource-spot') as HTMLElement // the line for the player's resources
const troopListSpot: HTMLElement = document.getElementById('troop-list-spot') as HTMLElement // the scrolling box that shows what troops the player has

// get the control buttons
const refreshButton: HTMLButtonElement = document.getElementById('refresh-button') as HTMLButtonElement // refresh button 
const travelButton: HTMLButtonElement = document.getElementById('travel-button') as HTMLButtonElement // travel button
const tradeButton: HTMLButtonElement = document.getElementById('trade-button') as HTMLButtonElement // trade button
const endTurnButton: HTMLButtonElement = document.getElementById('end-turn-button') as HTMLButtonElement // end turn button
const cancelTurnButton: HTMLElement = document.getElementById('cancel-turn-button') as HTMLElement // button to retract your turn
//#endregion HTMLElements

// stores the coordinates of the selected time period
let n_selectedPlanetIndex: number
let n_selectedTimePeriodIndex: number

const DrawPlayerList = (): void => {
    playerListBox.innerHTML = ``
    pa_players.forEach((p) => {
        // creates the string
        let playerHTML: string = `<div class="player-card" id="${p.s_name}-card">`
        if (!p.b_hasSubmitted) { // if p is the player whose turn it is
            playerHTML += `<h3>--[${p.s_name}]--</h3>` // adds the player's name in bold
        } else {
            playerHTML += `<h3>${p.s_name}</h3>` // adds the player's name without the star
        }
        if (p.na_location[0] === -1) { // adds the player's location if they have one
            playerHTML += `<h4>Location: Nowhere</h4>` // if they don't
        } else { // if they do
            playerHTML += `<h4>Location: ${pa_planets[p.na_location[0]].s_name} Age ${p.na_location[1] + 1}</h4>`
        }
        playerHTML += `<h4>Resources: ${p.n_resources}</h4>` // adds the player's resources
        playerHTML += `<div style="height:70px;border:3px solid #ccc;background-color: #FFF;font:16px/26px Georgia, Garamond, Serif;overflow:auto;" class="player-list-troop-list-spot">` //starts the player's troop list
        playerHTML += TroopsString(p.a_troops, false) // adds their list of troops
        playerHTML += `</div>` // closes the troop list div
        playerHTML += `</div>` // closes the div
        playerListBox.innerHTML += playerHTML // adds the generated player card to the list
        
        let specificPlayerCard: HTMLElement = document.getElementById(`${p.s_name}-card`) as HTMLElement
        if (p.a_troops.n_ownerIndex < playerColors.length && p.a_troops.n_ownerIndex >= 0) { // makes sure there is a color for this number player
            specificPlayerCard.style.backgroundColor = playerColors[p.a_troops.n_ownerIndex]
        }
        if (!p.b_hasSubmitted) { // if this player is the player whose turn it is
            specificPlayerCard.style.borderColor = "red" // make the border of their box red
        }
    })
}

const DrawBoard = (): void => {

    //#region Time Period Board
    timePeriodBoard.innerHTML = ``
    let ageNumbers: HTMLElement = document.createElement('div')
    ageNumbers.className = "time-period-board-column"
    ageNumbers.id = "age-numbers"
    // adds the numbers on the left of the board
    // creates the top space that will be empty
    let topSpace: HTMLElement = document.createElement('div')
    topSpace.className = "time-period-board-space"
    topSpace.id="top-space"
    ageNumbers.appendChild(topSpace) // adds the top space
    for (let i: number = 0; i < numTimePeriods; i++) { // creates each number in turn
        let ageNumber: HTMLElement = document.createElement('div')
        ageNumber.classList.add('time-period-number')
        ageNumber.style.height = `${95 / numTimePeriods}%`
        ageNumber.innerHTML = `<p>${i+1}</p>`
        ageNumbers.appendChild(ageNumber) // adds the number to the column
    }
    timePeriodBoard.appendChild(ageNumbers) // adds the numbers column to the board
    // adds each planet
    for (let i: number = 0; i < numPlanets; i++) { // column for each planet
        // creates the column
        let planetColumn: HTMLElement = document.createElement('div')
        planetColumn.className = "time-period-board-column"
        planetColumn.id = `${pa_planets[i].s_name}-column`

        // adds the header to the top of the column
        let planetHeader: HTMLElement = document.createElement('div')
        planetHeader.className = 'planet-header'
        planetHeader.id = `${pa_planets[i].s_name}-header`
        planetHeader.innerHTML = `<p>${pa_planets[i].s_name}</p>`
        planetColumn.appendChild(planetHeader) // adds the name to the top
        planetColumn.style.width = `${95 / numPlanets}%`

        for (let j: number = 0; j < numTimePeriods; j++) { // adds all the planets
            // creates the box for the time period
            let timePeriodBox: HTMLElement = document.createElement('div')
            timePeriodBox.classList.add("time-period-space")
            timePeriodBox.classList.add("time-period-box")
            timePeriodBox.id = `age-${j+1}-box`
            timePeriodBox.style.height = `${95 / numTimePeriods}%`
            /*if (pa_planets[i].ta_timePeriods[j].n_ownerIndex < playerColors.length && pa_planets[i].ta_timePeriods[j].n_ownerIndex >= 0) { // makes sure there is a color for this number player
                timePeriodBox.style.backgroundColor = playerColors[pa_planets[i].ta_timePeriods[j].n_ownerIndex]
            }*/
            timePeriodBox.addEventListener('click', () => { // adds the event to each time period box to select it
                if (n_selectedPlanetIndex === i && n_selectedTimePeriodIndex === j) { // deselects the box if it was already selected
                    n_selectedPlanetIndex = -1
                    n_selectedTimePeriodIndex = -1
                    timePeriodBox.style.borderColor = `black`

                    if (window.getComputedStyle(controlSection).display === 'block') {
                        controlSection.style.display = `none`
                        emptySection.style.display = `block`
                        controlsSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
                    }
                    controlsSectionSelectorButton.style.display = `none`
                    objectSectionSelectorSection.querySelectorAll("Button").forEach((b) => (b as HTMLButtonElement).style.width = "25%")
                } else {
                    n_selectedPlanetIndex = i
                    n_selectedTimePeriodIndex = j
                    timePeriodBox.style.borderColor = `red`

                    if (pa_planets[i].ta_timePeriods[j].n_ownerIndex !== myIndex) {
                        controlsSectionSelectorButton.style.display = `none`
                        objectSectionSelectorSection.querySelectorAll("Button").forEach((b) => (b as HTMLButtonElement).style.width = "25%")

                        if (window.getComputedStyle(controlSection).display === 'block') {
                            controlSection.style.display = `none`
                            emptySection.style.display = `block`
                            controlsSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
                        }
                    } else {
                        controlsSectionSelectorButton.style.display = `inline`
                        objectSectionSelectorSection.querySelectorAll("Button").forEach((b) => (b as HTMLButtonElement).style.width = "20%")
                    }

                }
                DrawBoard()
            })

            if (pa_planets[i].ta_timePeriods[j].b_propagationBlocked && j !== 0) { // checks if the time period is propagation blocked
                timePeriodBox.style.borderTop = `dashed` // if it is, make the top of the border dashed                
            }
            if (n_selectedPlanetIndex === i && n_selectedTimePeriodIndex === j) { // check if this one is selected
                timePeriodBox.style.borderColor = `red` // if so: set the border to red
            }

            // add the info that should appear in the box
            timePeriodBox.style.display = `flex`
            timePeriodBox.style.flexFlow = `row nowrap`
            if (pa_planets[i].ta_timePeriods[j].n_ownerIndex > -1) { // if it is owned by a player
                timePeriodBox.innerHTML = 
                `<div class="time-period-owner-flap" style="background-color: ${playerColors[pa_planets[i].ta_timePeriods[j].n_ownerIndex]}"><p>${pa_players[pa_planets[i].ta_timePeriods[j].n_ownerIndex].s_name}</p></div>` // fill in their name
            } else { // if time period is controlled by natives
                timePeriodBox.innerHTML = 
                `<div class="time-period-owner-flap" style="background-color: ${playerColors[pa_planets[i].ta_timePeriods[j].n_ownerIndex]}"><p>Uncolonized</p></div>` // fill in "Uncolonized"
                //timePeriodBox.innerHTML = `<p>Uncolonized</p>` // fill in "Uncolonized"
            }
            if (pa_planets[i].ta_timePeriods[j].aa_armies.length > 1) {
                timePeriodBox.innerHTML += 
                `<div class="time-period-war-flap" style="background-color:${warColor}"><p>War</p></div>`
            } else {
                timePeriodBox.innerHTML += 
                `<div class="time-period-war-flap" style="background-color: ${paxColor}"><p>Pax</p></div>`
            }

            planetColumn.appendChild(timePeriodBox) //adds the box to the column
        }

        timePeriodBoard.appendChild(planetColumn) //adds the planet column to the board
    }
    //#endregion Time Period Board

    //#region Selected Time Period Info Board
    if (n_selectedPlanetIndex != -1) {
        planetLine.innerHTML = `${pa_planets[n_selectedPlanetIndex].s_name}` // writes which planet is selected
        ageLine.innerHTML = `Age ${n_selectedTimePeriodIndex + 1}` // writes which time period is selected
        // writes the relevant info from the time period
        if (pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_ownerIndex === -1) { //checks if the time period is owner by a player
            ownerLine.innerHTML = `Owner: ${pa_planets[n_selectedPlanetIndex].s_name} Natives` //if not: writes that it is owned by people from that planet
        } else {
            ownerLine.innerHTML = `Owner: ${pa_players[pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_ownerIndex].s_name}` //if so: writes the owner of the time period
        }
        powerLine.innerHTML = `Power Level: ${pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_level + pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_powerModifier}` //writes the power level of the time period to the label
        resourcesLine.innerHTML = `Resources: ${(Math.round(pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_resources * 100)) / 100}` //writes the number of resources in the time period
        resourceProductionLine.innerHTML = `Resource Production Rate: ${(Math.round(pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_resourceProduction * 100)) / 100}` //writes the resource production rate to the label
        
        buildingBox.innerHTML = `` // resets the text in the building box
        if (pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].ba_buildings.length > 0) { //checks if there are any buildings in the time period
            pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].ba_buildings.forEach((b) => buildingBox.innerHTML += `${b.s_name}<br>`) //if so: loops through them all and writes them to the box
        } else {
            buildingBox.innerHTML = `None` // if not: writes none to the list
        }
        troopBox.innerHTML = `` // resets the text in the troop box
        if (pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].aa_armies.length > 0) { //if there are any armies in the time period
            for (let i: number = 0; i < pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].aa_armies.length; i++) { //if so:loops through all of armies in the time period to be written out
                troopBox.innerHTML += TroopsString(pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].aa_armies[i], true)
            }
        } else {
            troopBox.innerHTML = `None` // if not: writes none to the list
        }
        presentPlayersBox.innerHTML = `` // resets the present players box
        let sa_presentPlayers: string[] = []
        pa_players.forEach((p) => { // goes through all the players and stores the names of the ones in the selected location
            if (p.na_location[0] === n_selectedPlanetIndex && p.na_location[1] === n_selectedTimePeriodIndex) {
                sa_presentPlayers.push(p.s_name)
            }
        })
        if (sa_presentPlayers.length > 0) {
            sa_presentPlayers.forEach((n) => presentPlayersBox.innerHTML += `${n}<br>`) // adds all the saved names to the list
        } else {
            presentPlayersBox.innerHTML = `None`
        }
        if (pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_ownerIndex === myIndex 
            && !pa_players[myIndex].b_hasSubmitted) { // hides the controls if the player does not own the time period or it is not their turn
            trainTroopButton.innerHTML = `Train Troop - [${trainTroopCost}]`
            controlsSectionSelectorButton.style.display = `block`
            objectSectionSelectorSection.querySelectorAll("Button").forEach((b) => (b as HTMLButtonElement).style.width = "20%")
        } else {
            controlsSectionSelectorButton.style.display = `none`
            objectSectionSelectorSection.querySelectorAll("Button").forEach((b) => (b as HTMLButtonElement).style.width = "25%")
        }
        scorchedEarthButton.innerHTML = `Scorched Earth: ${pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].b_scorchedEarth ? "True" : "False"}`
        buildQueueBox.innerHTML = `` // resets the build queue box
        if (pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].boa_buildQueue.length > 0) {
            pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].boa_buildQueue
            
            buildQueueBox.innerHTML += `In Progress:<br>`
            if (pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].boa_buildQueue[0].tb_target.constructor === Troop) { // if next up is a troop
                buildQueueBox.innerHTML += `Troop: ${(pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].boa_buildQueue[0].tb_target as Troop).ToString()} Turns Remaining: ${pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].boa_buildQueue[0].n_turnsRemaining}<br>`
            } else { // if next up is a building
                buildQueueBox.innerHTML += `Building: ${(pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].boa_buildQueue[0].tb_target as Building).s_name} Turns Remaining: ${pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].boa_buildQueue[0].n_turnsRemaining}<br>`
            }
            buildQueueBox.innerHTML += `Queue:<br>`
            for (let i: number = 1; i < pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].boa_buildQueue.length; i++) {
                if (pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].boa_buildQueue[i].tb_target.constructor === Troop) { // if next up is a troop
                    buildQueueBox.innerHTML += `${i}> Troop: ${(pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].boa_buildQueue[i].tb_target as Troop).ToString()} Turns Remaining: ${pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].boa_buildQueue[i].n_turnsRemaining}<br>`
                } else { // if next up is a building
                    buildQueueBox.innerHTML += `${i}> Building: ${(pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].boa_buildQueue[i].tb_target as Building).s_name} Turns Remaining: ${pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].boa_buildQueue[i].n_turnsRemaining}<br>`
                }
            }
        } else {
            buildQueueBox.innerHTML = `None`
        }        
    }  else {
        // resets the display values when deselecting
        planetLine.innerHTML = `No Planet Selected` // resets the time period age
        ageLine.innerHTML = `No Time Period Selected` // resets the time period age
        ownerLine.innerHTML = `Owner: ` // resets the owner of the time period
        powerLine.innerHTML = `Power Level: ` // resets the power level label
        resourcesLine.innerHTML = `Resources: ` // resets the number of resources in the time period
        resourceProductionLine.innerHTML = `Resource Production Rate: ` // resets the resource production rate label
        buildingBox.innerHTML = `` // resets the list of buildings
        troopBox.innerHTML = `` // resets the list of troops
        presentPlayersBox.innerHTML = `` // resets the present players box
        buildQueueBox.innerHTML = `` // resets the build queue box
    }
    //#endregion Selected Time Period Info Board

    //Players Board
    DrawPlayerList()

    //#region Current Player Info Board
    refreshButton.style.display = `inline` // sets the refresh button to always be available
    if (myIndex === -1) { // sidestep much of the drawing if the player is a spectator and not one of the players
        locationSpot.innerHTML = `Spectator`
        troopListSpot.innerHTML = `N/A`

        resourceSpot.innerHTML = ``

        travelButton.style.display = `none`
        tradeButton.style.display = `none`
        endTurnButton.style.display= `none`
    } else {
        // fill in the current turn section
        turnNumberSpot.innerHTML = `Current Turn: ${turnNumber}`
        turnListSpot.innerHTML = ``
        for (let i: number = 0; i < turnActions.Actions.length; i++) {
            switch (turnActions.Actions[i].Type) {
                case "Move":
                    turnListSpot.innerHTML += `Move to ${pa_planets[turnActions.Actions[i].NewLocation[0]].s_name} : ${turnActions.Actions[i].NewLocation[1] + 1}<br>`
                    break;
                case "Trade":
                    turnListSpot.innerHTML += `Trade at ${pa_planets[turnActions.Actions[i].TargetTimePeriod[0]].s_name} : ${turnActions.Actions[i].TargetTimePeriod[1] + 1}<br>`
                    break;
                case "Build":
                    turnListSpot.innerHTML += `Build ${BuildingType[turnActions.Actions[i].BuildingType].toString()} at ${pa_planets[turnActions.Actions[i].Planet].s_name} : ${turnActions.Actions[i].TimePeriod + 1}<br>`
                    break;
                case "Train":
                    turnListSpot.innerHTML += `Train Troop at ${pa_planets[turnActions.Actions[i].Planet].s_name} : ${turnActions.Actions[i].TimePeriod + 1}<br>`
                    break;
            }
        }
        if (pa_players[myIndex].b_hasSubmitted) {
            turnListSpot.innerHTML += `Submit Turn<br>`
            turnListSpot.innerHTML += `Waiting for other players to submit their turns`
        }

        if (pa_players[myIndex].na_location[0] === -1 && myIndex !== -1) { // checks if the player has not yet gone to a time period
            locationSpot.innerHTML = `Location: Nowhere` // if so: show them as nowhere
        } else {
            locationSpot.innerHTML = `Location: ${pa_planets[pa_players[myIndex].na_location[0]].s_name} Age ${pa_players[myIndex].na_location[1] + 1}` //if not: write which planet and time period they are in
        }
        resourceSpot.innerHTML = `Resources: ${pa_players[myIndex].n_resources}` // fills in the line showing the player's resources
        if (pa_players[myIndex].a_troops.ta_troops.length > 0) { // checks if the player has any troops onboard
            troopListSpot.innerHTML = `${TroopsString(pa_players[myIndex].a_troops, false)}` //writes the player's TroopString to the box
        } else {
            troopListSpot.innerHTML = `None`// if not: writes none
        }
        refreshButton.style.display = `inline` // sets the refresh button to always be available
        if (!(pa_players[myIndex].n_remainingMoves > 0) || pa_players[myIndex].b_hasSubmitted) { // hides the travel button if the player does not have their travel action or if the player is not the player whose turn it is
            travelButton.style.display = `none`
        } else {
            travelButton.style.display = `inline`
            travelButton.innerHTML = `Travel - [${pa_players[myIndex].n_remainingMoves}]`
            if ((pa_players[myIndex].na_location[0] !== n_selectedPlanetIndex || pa_players[myIndex].na_location[1] !== n_selectedTimePeriodIndex) && n_selectedPlanetIndex !== -1) {
                travelButton.style.backgroundColor = "white"
            } else {
                travelButton.style.backgroundColor = buttonBackgroundColor
            }
        }
        if (!(pa_players[myIndex].n_remainingTrades > 0) || pa_players[myIndex].b_hasSubmitted) { // hides the trade button if the player does not have their trade action or if the player is not the player whose turn it is
            tradeButton.style.display = `none`
        } else {
            tradeButton.style.display = `inline`
            tradeButton.innerHTML = `Trade - [${pa_players[myIndex].n_remainingTrades}]`
            if (pa_players[myIndex].na_location[0] === n_selectedPlanetIndex && pa_players[myIndex].na_location[1] === n_selectedTimePeriodIndex && n_selectedPlanetIndex !== -1) {
                tradeButton.style.backgroundColor = "white"
            } else {
                tradeButton.style.backgroundColor = buttonBackgroundColor
            }
        }
        if (pa_players[myIndex].b_hasSubmitted) { // hides the end turn button if the player is not the player whose turn it is and does the inverse for the cancel turn button
            endTurnButton.style.display= `none`
            cancelTurnButton.style.display = 'inline'
        } else {
            endTurnButton.style.display= `inline`
            cancelTurnButton.style.display = 'none'
        }
    }
    //#endregion Current Player Info Board
}

const CancelTurn = (): void => {
    console.log(`Cancelling Turn`) // LOG:

    fetch(`http://${ip}:${port}/cancelturn`, {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "PlayerIndex": myIndex
        })
    }).then((response) => response.json())
    .then((responseFile) => console.log(responseFile.responseValue))
    .then(() => Refresh()) // refresh the client
    .catch(() => { // if the server does not respond
        ShowLogin()
        ShowLoginFailed("Server not responding")
    })
}

const SubmitTurn = (): void => {
    console.log(`Submitting Turn: `) // LOG:
    console.log(`${turnActions}`)
    console.log(`${JSON.stringify(turnActions)}`)
    
    // sends the turn to the server
    fetch(`http://${ip}:${port}/submitturn`, {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(turnActions)
    }).then((response) => response.json())
    .then((responseFile) => {
        if (responseFile.responseValue === false) {
            console.log(`Server rejected your submission`)
            ShowLogin()
            ShowLoginFailed("Server rejected your submission. Please refresh, log back in, and try again")
        }
    }) // LOG: Debug the response of whether the turn went through or not
    .then(() => Refresh()) // refresh the client
    .catch(() => { // if the server does not respond
        ShowLogin()
        ShowLoginFailed("Server not responding")
    })
}

const FillInPlayerTurn = (actions: TurnActionsObject): void => {
    for (let i: number = 0; i < actions.Actions.length; i++) {
        // check if action is move or trade
        if (actions.Actions[i].Type === "Move") { // if its a move
            pa_players[actions.Header.CurrentTurnIndex].na_location = [actions.Actions[i].NewLocation[0], actions.Actions[i].NewLocation[1]] // moves the player on the server
        }
        if (actions.Actions[i].Type === "Trade") { // if its a trade
            TradeBetweenTurns(pa_planets[actions.Actions[i].TargetTimePeriod[0]].ta_timePeriods[actions.Actions[i].TargetTimePeriod[1]], actions.Actions[i].ResourcesGiven, actions.Actions[i].ResourcesTaken, actions.Actions[i].TroopsGiven, actions.Actions[i].TroopsTaken) // execute the trade
        }
        if (actions.Actions[i].Type === "Build") { // if its a build
            pa_planets[actions.Actions[i].Planet].ta_timePeriods[actions.Actions[i].TimePeriod].n_resources -= buildingCost // takes the cost
            pa_planets[actions.Actions[i].Planet].ta_timePeriods[actions.Actions[i].TimePeriod].StartBuilding(actions.Actions[i].BuildingType) // starts the building
        }
        if (actions.Actions[i].Type === "Train") { // if its a training
            pa_planets[actions.Actions[i].Planet].ta_timePeriods[actions.Actions[i].TimePeriod].StartTroopTraining() // starts training a troop
            pa_planets[actions.Actions[i].Planet].ta_timePeriods[actions.Actions[i].TimePeriod].n_resources -= trainTroopCost // charges the train troop cost
        }
    }
}

const FetchState = ():void => {
    fetch(`http://${ip}:${port}/gamestate`, {method: "GET"})
    .then(res => res.json())
    .then((gamestateJSON) => {
        console.log(gamestateJSON) // LOG: debug

        // check the game info
        if (gamestateJSON.gameID !== gameID) {
            console.log(`Wrong gameID detected. Refresh needed`) // TEMP:
            ShowLogin()
            ShowLoginFailed("Wrong gameID detected. Refresh needed")
        }
        turnNumber = gamestateJSON.turnNumber // set our turn number to the server turn number

        // Load in players from the gamestate
        let playersIn = gamestateJSON.players // get the list of players
        console.log(playersIn) // LOG: debug
        for (let i: number = 0; i < gamestateJSON.numPlayers; i++) {
            // create the player object and fill in its data
            let newPlayer = new Player(i, playersIn[i].name)
            newPlayer.b_hasSubmitted = playersIn[i].hasSubmitted
            newPlayer.n_resources = playersIn[i].resources
            newPlayer.na_location[0] = playersIn[i].location[0]
            newPlayer.na_location[1] = playersIn[i].location[1]
            newPlayer.n_remainingMoves = playersIn[i].remainingMoves
            newPlayer.n_remainingTrades = playersIn[i].remainingTrades
            
            // Import Troops
            newPlayer.a_troops.ta_troops = [] // clear the default army
            let troopsIn = playersIn[i].troops // get the list of troops from the current player
            for (let j: number = 0; j < troopsIn.length; j++) { // loop through the troops
                    // create the troop object and fill in its data
                    let newTroop: Troop = new Troop(troopsIn[j].rawLevel, troopsIn[j].modifier, troopsIn[j].health)
                    newTroop.n_level = troopsIn[j].level
                    newTroop.n_id = troopsIn[j].id
                    newPlayer.a_troops.ta_troops.push(newTroop) // push the troop to the army
            }
            pa_players.push(newPlayer) // add the loaded in player to the list
        }

        // Load in tunable values from the gamestate
        numPlanets = gamestateJSON.numPlanets
        numTimePeriods = gamestateJSON.numTimePeriods
        warehouseBonusPercent = gamestateJSON.warehouseBonusPercent
        trainTroopCost = gamestateJSON.trainTroopCost
        troopTrainBaseTime = gamestateJSON.troopTrainBaseTime
        trainingCampDiscount = gamestateJSON.trainingCampDiscount
        healthRecoveryPercent = gamestateJSON.healthRecoveryPercent
        fortressProtectionPercent = gamestateJSON.fortressProtectionPercent
        buildingCost = gamestateJSON.buildingCost
        buildingTime = gamestateJSON.buildingTime

        // Load in planets from the gamestate
        let planetsIn = gamestateJSON.planets // get the list of planets
        console.log(planetsIn) // LOG: debug
        for (let i: number = 0; i < numPlanets; i++) {
            // create the planet object and fill in its data
            let newPlanet: Planet = new Planet(planetsIn[`${i}`].name, 0) // dark age point not sent here, send in each time period
                
            let timePeriodsIn = planetsIn[i].time_periods // get the list of time periods
            for (let j: number = 0; j < numTimePeriods; j++) {
                // create the time period object and fill in its data
                let newTimePeriod: TimePeriod = new TimePeriod(timePeriodsIn[j].rawLevel, timePeriodsIn[j].rawModifierFactor, timePeriodsIn[j].darkAgeValue)
                newTimePeriod.n_ownerIndex = timePeriodsIn[j].ownerIndex
                newTimePeriod.n_level = timePeriodsIn[j].level
                newTimePeriod.n_powerModifier = timePeriodsIn[j].powerModifier
                newTimePeriod.n_resources = timePeriodsIn[j].resources
                newTimePeriod.n_resourceProduction  = timePeriodsIn[j].resourceProduction
                    
                // Buildings
                let buildingsIn = timePeriodsIn[j].buildings
                for (let k: number = 0; k < buildingsIn.length; k++) {
                    let newBuilding: Building = new Building(buildingsIn[k].type, buildingsIn[k].name) // create the new building and fill in its data
                    newTimePeriod.ba_buildings.push(newBuilding) // push the building to the time period
                }

                // Armies
                let armiesIn = timePeriodsIn[j].armies
                for (let k: number = 0; k < armiesIn.length; k++) {
                    let newArmy: Army = new Army(armiesIn[k].owner_index, []) // create the new army and fill in the owner
                    let troopsIn = armiesIn[k].troops
                    for (let m: number = 0; m < troopsIn.length; m++) {
                        // create the troop object and fill in its data
                        let newTroop: Troop = new Troop(troopsIn[m].rawLevel, troopsIn[m].modifier, troopsIn[m].health)
                        newTroop.n_level = troopsIn[m].level
                        newTroop.n_id = troopsIn[m].id
                        newArmy.ta_troops.push(newTroop) // push the troop to the army
                    }
                    newTimePeriod.aa_armies.push(newArmy) // add the army to the time period list
                }

                // Build orders
                let buildOrdersIn = timePeriodsIn[j].build_orders
                for (let k: number = 0; k < buildOrdersIn.length; k++) {
                    let newTarget: Troop | Building = new Building(0) // create the object for the target of the build order
                    // fill it in depending on the type
                    if (buildOrdersIn[k].type === "Building") { // if its a building
                        newTarget = new Building(buildOrdersIn[k].target.type, buildOrdersIn[k].target.name) // fill it in
                    }
                    if (buildOrdersIn[k].type === "Troop") { // if its a troop
                        // fill it in
                        newTarget = new Troop(buildOrdersIn[k].target.rawLevel, buildOrdersIn[k].target.modifier, buildOrdersIn[k].target.health)
                        newTarget.n_level = buildOrdersIn[k].target.level
                        newTarget.n_id = buildOrdersIn[k].target.id
                    }
                    let newBuildOrder: BuildOrder = new BuildOrder(newTarget, buildOrdersIn[k].turns_remaining) // create the build order and fill it in with the target object
                    newTimePeriod.boa_buildQueue.push(newBuildOrder) // add the loaded build order to the list
                }

                newTimePeriod.b_hasCombat = timePeriodsIn[j].hasCombat
                newTimePeriod.b_propagationBlocked = timePeriodsIn[j].propagationBlocked
                newTimePeriod.b_conquested = timePeriodsIn[j].conquested
                newTimePeriod.b_scorchedEarth = timePeriodsIn[j].scorchedEarth
                newPlanet.ta_timePeriods[j] = newTimePeriod // set the newly loaded time period to be the correct time period in the planet
            }

            pa_planets.push(newPlanet) // add the loaded in planet to the list
        }

        let playerTurn: any = JSON.parse(gamestateJSON.playerTurns).filter((t:TurnActionsObject) => t.Header.CurrentTurnIndex === myIndex)
        console.log(playerTurn)
        if (playerTurn.length > 0) {
            turnActions = playerTurn[0]
            FillInPlayerTurn(turnActions)
        }
    })
    .then(() => {
        if (!pa_players[myIndex].b_hasSubmitted) {
            // resets the turn actions object
            turnActions = {
                Header: {
                    CurrentTurnIndex: myIndex,
                    GameID: gameID,
                    TurnNumber: turnNumber
                },
                Actions: []
            }
        }
    })
    .then(() => DrawBoard())
    .catch((e) => { // if the server does not respond
        console.log(e)
        ShowLogin()
        ShowLoginFailed("Server not responding")
    })
}

const FetchSubmissionStates = (): void => {
    fetch(`http://${ip}:${port}/submissionstates`, {method: "GET"})
    .then(res => res.json())
    .then((submissionStates) => {
        console.log(submissionStates)
        for (let i: number = 0; i < submissionStates.states.length; i++) {
            pa_players[i].b_hasSubmitted = submissionStates.states[i]
        }
    })
    .then(() => DrawPlayerList())
    .catch((e) => { // if the server does not respond
        console.log(e)
        ShowLogin()
        ShowLoginFailed("Server not responding")
    })
}

const Refresh = (): void => {
    pa_players = [] // resets the list of players in the game
    pa_planets = [] // resets the list of planets in the game
    
    FetchState() // fetches the gamestate from the server

    tradingWindow.style.display = 'none' // hides the trading window as it is not in use when the game start
    buildingWindow.style.display = 'none' // hides the building window as it is not in use when the game start
}

const Initialize = (): void => {
    n_selectedPlanetIndex = -1
    n_selectedTimePeriodIndex = -1

    pa_players = [] // resets the list of players in the game
    pa_planets = [] // resets the list of planets in the game

    // initializes some style for the page
    document.body.style.backgroundColor = gameBackgroundColor // sets the background of the site to the gameBackgroundColor
    timePeriodBoard.style.backgroundColor = boardBackgroundColor
    selectedTimePeriodDisplay.style.backgroundColor = boardBackgroundColor // sets the display background color to the same color as the canvas
    playerListDisplay.style.backgroundColor = boardBackgroundColor // sets the background color of the player list board to the board background color
    currentPlayerInfoBox.style.backgroundColor = boardBackgroundColor // sets the background color of the player info box to the board background color

    tradingWindow.style.backgroundColor = boardBackgroundColor // set the background color of the trading window
    buildingWindow.style.backgroundColor = boardBackgroundColor // sets the background color of the building window

    // sets up the central position of the trading window
    tradingWindow.style.position = 'fixed'
    tradingWindow.style.left = '5%'
    tradingWindow.style.top = '100px'
    tradingWindow.style.display = 'none' // hides the trading window as it is not in use when the game start
    // sets up the central position of the building window
    buildingWindow.style.position = 'fixed'
    buildingWindow.style.left = '25%'
    buildingWindow.style.top = '100px'
    buildingWindow.style.display = 'none' //hides the trading window as it is not in use when the game start

    // hide the various list sections so they can be selected
    emptySection.style.display = `block`
    buildingSection.style.display = `none`
    troopSection.style.display = `none`
    buildQueueSection.style.display = `none`
    presentPlayersSection.style.display = `none`
    controlSection.style.display = `none`

    controlsSectionSelectorButton.style.display = `none`
    objectSectionSelectorSection.querySelectorAll("Button").forEach((b) => (b as HTMLButtonElement).style.width = "25%")

    // reset the button colors
    buildingsSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
    troopsSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
    queueSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
    playersSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
    controlsSectionSelectorButton.style.backgroundColor = buttonBackgroundColor

    // makes selected time period buttons work
    buildingsSectionSelectorButton.addEventListener("click", () => {
        buildingsSectionSelectorButton.style.backgroundColor = boardBackgroundColor
        troopsSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
        queueSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
        playersSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
        controlsSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
        
        emptySection.style.display = `none`
        buildingSection.style.display = `block`
        troopSection.style.display = `none`
        buildQueueSection.style.display = `none`
        presentPlayersSection.style.display = `none`
        controlSection.style.display = `none`
    })
    troopsSectionSelectorButton.addEventListener("click", () => {
        buildingsSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
        troopsSectionSelectorButton.style.backgroundColor = boardBackgroundColor
        queueSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
        playersSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
        controlsSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
        
        emptySection.style.display = `none`
        buildingSection.style.display = `none`
        troopSection.style.display = `block`
        buildQueueSection.style.display = `none`
        presentPlayersSection.style.display = `none`
        controlSection.style.display = `none`
    })
    queueSectionSelectorButton.addEventListener("click", () => {
        buildingsSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
        troopsSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
        queueSectionSelectorButton.style.backgroundColor = boardBackgroundColor
        playersSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
        controlsSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
        
        emptySection.style.display = `none`
        buildingSection.style.display = `none`
        troopSection.style.display = `none`
        buildQueueSection.style.display = `block`
        presentPlayersSection.style.display = `none`
        controlSection.style.display = `none`
    })
    playersSectionSelectorButton.addEventListener("click", () => {
        buildingsSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
        troopsSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
        queueSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
        playersSectionSelectorButton.style.backgroundColor = boardBackgroundColor
        controlsSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
        
        emptySection.style.display = `none`
        buildingSection.style.display = `none`
        troopSection.style.display = `none`
        buildQueueSection.style.display = `none`
        presentPlayersSection.style.display = `block`
        controlSection.style.display = `none`
    })
    controlsSectionSelectorButton.addEventListener("click", () => {
        buildingsSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
        troopsSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
        queueSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
        playersSectionSelectorButton.style.backgroundColor = buttonBackgroundColor
        controlsSectionSelectorButton.style.backgroundColor = boardBackgroundColor
        
        emptySection.style.display = `none`
        buildingSection.style.display = `none`
        troopSection.style.display = `none`
        buildQueueSection.style.display = `none`
        presentPlayersSection.style.display = `none`
        controlSection.style.display = `block`
    })

    // makes player control buttons work
    refreshButton.addEventListener("click", () => Refresh()) // refresh button functionality
    tradeSubmitButton.addEventListener("click", () => Trade(myIndex, pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex], n_selectedPlanetIndex, n_selectedTimePeriodIndex)) // makes the trade submit button work
    tradeCancelButton.addEventListener("click", () => CloseTradeWindow(myIndex, pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex])) // makes  the cancel button work
    travelButton.addEventListener("click", () => { // travel button functionality
        if (pa_players[myIndex].n_remainingMoves > 0 && n_selectedPlanetIndex > -1 && (n_selectedPlanetIndex !== pa_players[myIndex].na_location[0] || n_selectedTimePeriodIndex !== pa_players[myIndex].na_location[1])) { // makes sure the player can move this turn, has a time period selected, and are not already there
            pa_players[myIndex].n_remainingMoves -= 1 // takes one of the player's moves
            pa_players[myIndex].na_location = [n_selectedPlanetIndex, n_selectedTimePeriodIndex] // moves the player on the client
            turnActions.Actions.push({
                "Type": "Move",
                "NewLocation": [n_selectedPlanetIndex, n_selectedTimePeriodIndex]
            }) // Add the move to the turn json
            DrawBoard() // redraws the board
        }
    })
    tradeButton.addEventListener("click", ()  => { // trade button functionality
        if (pa_players[myIndex].n_remainingTrades > 0 && pa_players[myIndex].na_location[0] === n_selectedPlanetIndex && pa_players[myIndex].na_location[1] === n_selectedTimePeriodIndex && n_selectedPlanetIndex !== -1) { // makes sure the player can trade this turn and is in the selected time period
            pa_players[myIndex].n_remainingTrades -= 1 // takes one of the player's trades
            FillInTradeWindow(myIndex, pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex]) // starts the trade
        }
    })
    trainTroopButton.innerHTML += ` - ${trainTroopCost}`
    trainTroopButton.addEventListener("click", () => {
        if (pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_resources >= trainTroopCost) { // makes sure that the time period can afford to train the troop
            pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].StartTroopTraining() // starts training a troop
            pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_resources -= trainTroopCost // charges the train troop cost
            turnActions.Actions.push({
                    "Type": "Train",
                    "Planet": n_selectedPlanetIndex,
                    "TimePeriod": n_selectedTimePeriodIndex
                }) // Add the training to the turn json
            DrawBoard() // redraws the board
        }
    }) // makes the button to train troops work
    buildBuildingsButton.addEventListener("click", () => FillInBuildWindow()) // makes the Build Buildings button work
    scorchedEarthButton.addEventListener("click", () => {
        pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].b_scorchedEarth = !pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].b_scorchedEarth // toggles the scorched earth of the selected time period
        DrawBoard() // redraws the board
    }) // makes the scorched earth button work
    endTurnButton.addEventListener("click", () => {
        if (window.getComputedStyle(tradingWindow).display !== 'block' && window.getComputedStyle(buildingWindow).display !== 'block') {
            SubmitTurn()
        }
    }) // end turn button functionality, makes the end turn button run the AdvanceTurn() function
    cancelTurnButton.addEventListener("click", () => CancelTurn()) // cancel turn button functionality
    cancelTurnButton.style.display = 'none'

    FetchState() // fetches the gamestate from the server
}
//#endregion Main Game Logic

//----------------------------------------------
//---------------Login LOGIC--------------------
//----------------------------------------------

//#region Login
const loginWindow: HTMLElement = document.getElementById('login-window') as HTMLElement
const loginFailedMessage: HTMLElement = document.getElementById('login-failed-message') as HTMLElement
const topLayer: HTMLElement = document.getElementById('top-layer') as HTMLMediaElement

const ShowLogin = (): void => {
    loginWindow.style.backgroundColor = boardBackgroundColor
    loginWindow.style.outlineColor = boardOutlineColor
    loginWindow.style.display = "flex"
    topLayer.style.display = "none"
    currentPlayerInfoBox.style.display = "none"

    // initializes some style for the page
    timePeriodBoard.style.backgroundColor = boardBackgroundColor
    selectedTimePeriodDisplay.style.backgroundColor = boardBackgroundColor // sets the display background color to the same color as the canvas
    playerListDisplay.style.backgroundColor = boardBackgroundColor // sets the background color of the player list board to the board background color
    currentPlayerInfoBox.style.backgroundColor = boardBackgroundColor // sets the background color of the player info box to the board background color

    // sets up the central position of the trading window
    tradingWindow.style.position = 'fixed'
    tradingWindow.style.left = '5%'
    tradingWindow.style.top = '100px'
    tradingWindow.style.display = 'none' // hides the trading window as it is not in use when the game start
    // sets up the central position of the building window
    buildingWindow.style.position = 'fixed'
    buildingWindow.style.left = '25%'
    buildingWindow.style.top = '100px'
    buildingWindow.style.display = 'none' // hides the trading window as it is not in use when the game start
}

const AttemptLogin = (): void => {
    // gets the inputted values
    // ip
    const ipInputField: HTMLInputElement = document.getElementById('ip-input') as HTMLInputElement
    const ipInputted: string = ipInputField.value as string
    // port
    const portInputField: HTMLInputElement = document.getElementById('port-input') as HTMLInputElement
    const portInputted: string = portInputField.value as string
    // username
    const usernameInputField: HTMLInputElement = document.getElementById('name-input') as HTMLInputElement
    const usernameInputted: string = usernameInputField.value as string

    fetch(`http://${ipInputted}:${portInputted}/login`, {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "Username": usernameInputted
        })
    })
    .then((response) => response.json())
    .then((responseFile) => {
        myIndex = responseFile.index
        gameID = responseFile.gameID
        turnNumber = responseFile.turnNumber
    })
    .then(() => {
        if (myIndex !== -1) {
            console.log(`Login Succeeded | Index: ${myIndex}`) // LOG:

            // set the saved ip and port to the inputted values
            ip = ipInputted
            port = portInputted

            // close the login window and initialize the game
            CloseLogin()
            Initialize() // Start the client
        } else {
            ShowLoginFailed("Username not found in registered players.")
            return
        }
    })
    .catch(() => {
        ShowLoginFailed("Server not responding")
        return
    })
}

const CloseLogin = (): void => {
    loginWindow.style.display = "none"
    topLayer.style.display = "flex"
    currentPlayerInfoBox.style.display = "flex"

    setInterval(() => { // once the player successfully logs in, set a automatic refresh interval
        if (pa_players[myIndex].b_hasSubmitted) { // if it its not the player's turn
            Refresh() // refresh every so often to see if it is
        } else {
            FetchSubmissionStates() // refresh just whether or not each player has submitted
        }
    }, 5000) // interval of 5000 milliseconds (5 seconds)
}

const ShowLoginFailed = (errorMessage: string): void => {
    loginFailedMessage.style.display = "inline"
    loginFailedMessage.style.border = "2px solid red"
    loginFailedMessage.style.padding = "3px"
    loginFailedMessage.innerHTML = errorMessage

}
//#endregion Login

ShowLogin() // begin the login process to start the game

// TODO:
// -Get TradeBetweenTurns working
//
// Future changes to test:
// -Revisit how combat is resolved, may not be working as intended
// --A high level troop took what seemed like way too much damage from a very low level troop
//
// -Buildings feel too expensive in tests
// --Maybe make them cheaper
// --Maybe make the warehouse cheaper and, if needed, buff it
//
// -Do the time periods feel TOO similar and unimportant.
// --Should the variation in resource production be larger between time periods
// --Should we move to a multiple resource type system where certain time periods are better for
//   certain resources
// ---Could do 3 types of resources, each time period generates a balanced randomized amount of each
//    and the troops and buildings in each time period take a balance randomized amount of each so
//    the best troops may take resources that you have to get more of from other time periods so that
//    some time periods are valuable for a certain type of resource and some are valuable for the
//    quality of its troops.
// ----Balanced in the way that troop quality is balanced to resource gen: as one gets higher the
//     other gets lower.
// -----Have a set number for total resources generated, probably the one I have now which is
//      proportional to the troop quality; and take a random percentage of that for the first
//      resource, then another random percentage of the remaining amount for the second resource,
//      then the remainder for the third resource