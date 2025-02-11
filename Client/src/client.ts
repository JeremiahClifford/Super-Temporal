//----------------------------------------------
//--------------Tunable Values------------------
//----------------------------------------------

//#region Tunable Values
// these will have to come in from the server but can be this for now
const numPlanets: number = 5 //number of planets that the game should have
const numTimePeriods: number = 10 //stores how many time periods each planet should have

const maxModifierFactor: number = 0.05 //how high should the variance between time periods be allowed to get
const baseResourceProduction: number = 10 //base number of resource generation that each time period generates
const resourceRateAdjuster: number = 10 //number that the inverted modifier is multiplied by to make the differences between the resource production of different time periods substantial
const warehouseBonusPercent: number = 0.05 //percent added to one of increase of resources if time period has a warehouse
const resourceGenPropagates: boolean = false //should resources added to a time period by normal resource gen propagate. Added because in testing, resource numbers got out of control

const gameBackgroundColor: string = "#03053c" //background color of the whole game
const boardBackgroundColor: string = "#e8e8e8" //color of the background of the various boards
const boardOutlineColor: string = "#2c2c2c" //color of the outline of the various boards

const trainTroopCost: number = 50 //how many resources should it cost to train a troop
const latenessFactor: number = 0.5 //by what factor should later time period resources be reduced

const darkAges: boolean = false //should dark ages be in play and affect power values

const troopTrainBaseTime: number = 3 //how long it takes to train a troop by default
const trainingCampDiscount: number = 1 //how many turns the training camp reduces troop training by
const healthRecoveryPercent: number = 0.1 //how much health do troops recover per turn
const fortressProtectionPercent: number = 0.8 //how much damage do troops take if they are in a fortress

const buildingCost: number = 500 //how much it costs to build a building
const buildingTime: number = 5 //how many turns it takes to build a building
//#endregion Tunable Values

//----------------------------------------------
//--------------Helper Functions----------------
//----------------------------------------------

//#region Helper Function
const SortTroops = (ta: Troop[]): Troop[] => { //sorts the troops of an army in descending order of power
    return ta.sort((a, b) => { //uses the built in sort method
        return (b.n_level + b.n_modifier) - (a.n_level + a.n_modifier)
    })
}

const TroopsString = (a: Army, useName: boolean): string => { //gives a string representation of the player's or time period's list of troops
    a.ta_troops = SortTroops(a.ta_troops) //sorts the troops so they are in a good order to be printed

    //squashes troops of the same level into 1 line
    type troopType = {
        n_level: number
        n_health: number
        n_count: number
    }
    let troopTypes: troopType[] = []
    let found: boolean = false

    for (let i: number = 0; i < a.ta_troops.length; i++) { //loops through the army
        found = false
        for (let j: number = 0; j < troopTypes.length; j++) { //loops through the saved troop types
            if (troopTypes[j].n_level === (a.ta_troops[i].n_level + a.ta_troops[i].n_modifier) && troopTypes[j].n_health === a.ta_troops[i].n_health) { //checks if the troop type matches
                troopTypes[j].n_count++ //if so: increment the count
                found = true
            }
        }
        if (!found) { //if not: add new type to the list
            troopTypes.push({
                n_level: a.ta_troops[i].n_level + a.ta_troops[i].n_modifier,
                n_health: a.ta_troops[i].n_health,
                n_count: 1
            })
        }
    }

    let output: string = ``
    if (useName) { //if this use case requires the name of the owner to distinguish, add the name of the owner. only really used on the selected time period display as multiple armies owned by multiple players can appear there
        if (a.n_ownerIndex === -1) {
            output = `Natives:<br>` //adds the header to the output showing how many total troops the army has and the owner
        } else {
            output = `${pa_players[a.n_ownerIndex].s_name}:<br>` //adds the header to the output showing how many total troops the army has and the owner
        }
    }
    output += `${a.ta_troops.length} Troop(s):<br>` //adds th e number of troops
    for (let i: number = 0; i < troopTypes.length; i++) { //loops through the types
        output += `${troopTypes[i].n_count}x Level: ${troopTypes[i].n_level} Health: ${troopTypes[i].n_health}<br>` //adds a line of their info to the output string
    }
    return output //returns the outputted list
}
//#endregion Helper Function

//----------------------------------------------
//-------------Classes and Enums----------------
//----------------------------------------------

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

    b_canMove: boolean
    b_canTrade: boolean

    constructor (c_index: number, c_name: string) {
        this.s_name = c_name
        this.a_troops = new Army(c_index, [new Troop(1, 0), new Troop(1, 0)]) //TEMP: not sure what troops players will start with if any
        this.n_resources = 0
        this.na_location = [-1, -1]

        this.b_canMove = false
        this.b_canTrade = false
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
        this.n_id = Math.random() //TEMP:
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
        console.log(`Created Building: ${this.s_name}`)
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

//#region Propagation Objects
class PropagationOrder {

    b_adding: boolean //refers to if this order is to add something or remove something

    constructor (c_adding: boolean) {
        this.b_adding = c_adding
    }
}

class ResourcePropagationOrder extends PropagationOrder {

    n_amount: number

    constructor (c_adding: boolean, c_amount: number) {
        super(c_adding)

        this.n_amount = c_amount
    }

    ToString () {
        return `Type: Resource | Adding: ${this.b_adding} | Amount: ${this.n_amount}`
    }
}

class TroopPropagationOrder extends PropagationOrder {

    t_target: Troop

    constructor (c_adding: boolean, c_target: Troop) {
        super(c_adding)
        
        //manually copy over the troop
        this.t_target = new Troop(c_target.n_rawLevel, c_target.n_modifier, c_target.n_health)
    }

    ToString () {
        return `Type: Troop | Adding: ${this.b_adding} | Troop: ${(this.t_target as Troop).ToString()}`
    }
}

class BuildingPropagationOrder extends PropagationOrder {

    b_target: Building

    constructor (c_adding: boolean, c_target: Building) {
        super(c_adding)

        //manually copy over the building
        this.b_target = new Building(c_target.bt_type, c_target.s_name)
    }
}

class ConquestPropagationOrder extends PropagationOrder {

    n_newOwnerIndex: number
    n_newResources: number //resources from the time period that originated the propagation order that overrides the resources
    ba_newBuildings: Building[] //building list from the time period that originated the propagation order that overrides the building list
    aa_newArmies: Army[] //army list from the time period that originated the propagation order that overrides the army list

    constructor (c_adding: boolean, c_newOwnerIndex: number, c_newResources: number, c_newBuildings: Building[], c_newArmies: Army[]) {
        super(c_adding)

        this.n_newOwnerIndex = c_newOwnerIndex
        this.n_newResources = c_newResources
        //manually copy over the buildings array
        this.ba_newBuildings = []
        for (let i: number = 0; i < c_newBuildings.length; i++) {
            this.ba_newBuildings.push(new Building(c_newBuildings[i].bt_type, c_newBuildings[i].s_name))
        }
        //manually copy over the armies array
        this.aa_newArmies = []
        for (let i: number = 0; i < c_newArmies.length; i++) {
            //copy over the troops array of the armies
            let ta_newTroops: Troop[] = []
            for (let j: number = 0; j < c_newArmies[i].ta_troops.length; j++) {
                ta_newTroops.push(new Troop(c_newArmies[i].ta_troops[j].n_rawLevel, c_newArmies[i].ta_troops[j].n_modifier, c_newArmies[i].ta_troops[j].n_health))
            }
            this.aa_newArmies.push(new Army(c_newArmies[i].n_ownerIndex, ta_newTroops))
        }
    }

    ToString () {
        return `Type: Conquest | Adding: ${this.b_adding} | New Owner: ${this.n_newOwnerIndex}`
    }
}
//#endregion Propagation Objects

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
    pa_propagationOrders: (ResourcePropagationOrder | TroopPropagationOrder | BuildingPropagationOrder | ConquestPropagationOrder)[]
    b_hasCombat: boolean
    b_propagationBlocked: boolean
    b_conquested: boolean
    b_scorchedEarth: boolean //resources will continue to propagate to conquested time periods, which will be propagation blocked, unless the time period before is set to scorched earth, i.e. the player has told the people to destroy the resources before they are conquested. this can lead to another player getting resources that you generate or losing resources that you take and thus don't leave behind but if you go scorched earth the time periods disconnect and the latter time period gets a fresh start resource-wise. Troops and buildings don't propagate as those would all be lost in the battle for control. Conquest propagation orders don't go for obvious reasons.

    constructor (c_level: number, c_modifierFactor: number, c_darkAgeValue: number) {
        this.n_ownerIndex = -1 //sets the owner to the natives
        //this.n_ownerIndex = Math.floor((Math.random() * (pa_players.length + 1)) - 1) //TEMP: gives the time period a random owner
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
        this.aa_armies = [new Army(-1, [new Troop(this.n_rawLevel, this.n_powerModifier * 1.25)])] //TEMP: not sure what troops time periods will start with if any
        this.boa_buildQueue = []
        this.pa_propagationOrders = []
        this.b_hasCombat = false
        this.b_propagationBlocked = false
        this.b_conquested = false
        this.b_scorchedEarth = false
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
//-------------MAIN GAME LOGIC------------------
//----------------------------------------------

//#region Main Game Logic
let pa_players: Player[] = [] //stores the list of players in the game

let currentTurnIndex: number //stores which player is currently up

const pa_planets: Planet[] = [] //stores the list of the planets in play

//holds onto the time period board display
const timePeriodBoard: HTMLElement = document.getElementById('time-period-board') as HTMLElement

//holds onto the display for the selected time period and its parts
const selectedTimePeriodDisplay: HTMLElement = document.getElementById('selected-time-period-display') as HTMLElement //the whole display
const planetLine: HTMLElement = document.getElementById('planet-line') as HTMLElement //planet title
const ageLine: HTMLElement = document.getElementById('age-line') as HTMLElement //time period title
const ownerLine: HTMLElement = document.getElementById('owner-line') as HTMLElement //owner title
const powerLine: HTMLElement = document.getElementById('power-line') as HTMLElement //power level label
const resourcesLine: HTMLElement = document.getElementById('resources-line') as HTMLElement //resources line
const resourceProductionLine: HTMLElement = document.getElementById('resource-production-line') as HTMLElement //resource production line
const buildingSection: HTMLElement = document.getElementById('building-section') as HTMLElement //building list section
const buildingBox: HTMLElement = document.getElementById('building-list-box') as HTMLElement //box that holds list of buildings
const troopSection: HTMLElement = document.getElementById('troop-section') as HTMLElement //troop list section
const troopBox: HTMLElement = document.getElementById('troop-list-box') as HTMLElement //box that holds list of troops
const presentPlayersBox: HTMLElement = document.getElementById('present-players-list-box') as HTMLElement //box that holds the list pf players in this time period
const controlSection: HTMLElement = document.getElementById('time-period-control-section') as HTMLElement //section with the controls for the time period owner
const buildBuildingsButton: HTMLButtonElement = document.getElementById('build-buildings-button') as HTMLButtonElement //button to open the building menu
const trainTroopButton: HTMLButtonElement = document.getElementById('train-troop-button') as HTMLButtonElement //button to train a troop
const scorchedEarthButton: HTMLButtonElement = document.getElementById('scorched-earth-button') as HTMLButtonElement //button for scorched earth
const buildQueueSection: HTMLElement = document.getElementById('build-queue-section') as HTMLElement //section for the build queue
const buildQueueBox: HTMLElement = document.getElementById('build-queue-list-box') as HTMLElement //list box of the build queue

const playerListDisplay: HTMLElement = document.getElementById('player-list-display') as HTMLElement //the section which has the list of players
const playerListBox: HTMLElement = document.getElementById('player-list-box') as HTMLElement//the scrolling box that will show the list of players

//holds onto the display for the player's info
const currentPlayerInfoBox: HTMLElement = document.getElementById('player-info') as HTMLElement //the box that has the player's info
const locationSpot: HTMLElement = document.getElementById('location-spot') as HTMLElement //the line for the players location
const resourceSpot: HTMLElement = document.getElementById('resource-spot') as HTMLElement //the line for the player's resources
const troopListSpot: HTMLElement = document.getElementById('troop-list-spot') as HTMLElement //the scrolling box that shows what troops the player has

//get the control buttons
const travelButton: HTMLButtonElement = document.getElementById('travel-button') as HTMLButtonElement //travel button
const tradeButton: HTMLButtonElement = document.getElementById('trade-button') as HTMLButtonElement //trade button
const endTurnButton: HTMLButtonElement = document.getElementById('end-turn-button') as HTMLButtonElement //end turn button

//stores the coordinates of the selected time period
let n_selectedPlanetIndex: number = -1
let n_selectedTimePeriodIndex: number = -1

const DrawBoard = (): void => {

    //#region Time Period Board
    timePeriodBoard.innerHTML = ``
    let ageNumbers: HTMLElement = document.createElement('div')
    ageNumbers.className = "time-period-board-column"
    ageNumbers.id = "age-numbers"
    //adds the numbers on the left of the board
    //creates the top space that will be empty
    let topSpace: HTMLElement = document.createElement('div')
    topSpace.className = "time-period-board-space"
    topSpace.id="top-space"
    ageNumbers.appendChild(topSpace) //adds the top space
    for (let i: number = 0; i < numTimePeriods; i++) { //creates each number in turn
        let ageNumber: HTMLElement = document.createElement('div')
        ageNumber.classList.add('time-period-space')
        ageNumber.classList.add('time-period-number')
        ageNumber.style.height = `${95 / numTimePeriods}%`
        ageNumber.innerHTML = `<p>${i+1}</p>`
        ageNumbers.appendChild(ageNumber) //adds the number to the column
    }
    timePeriodBoard.appendChild(ageNumbers) //adds the numbers column to the board
    //adds each planet
    for (let i: number = 0; i < numPlanets; i++) { //column for each planet
        //creates the column
        let planetColumn: HTMLElement = document.createElement('div')
        planetColumn.className = "time-period-board-column"
        planetColumn.id = `${pa_planets[i].s_name}-column`

        //adds the header to the top of the column
        let planetHeader: HTMLElement = document.createElement('div')
        planetHeader.className = 'planet-header'
        planetHeader.id = `${pa_planets[i].s_name}-header`
        planetHeader.innerHTML = `<p>${pa_planets[i].s_name}</p>`
        planetColumn.appendChild(planetHeader) //adds the name to the top
        planetColumn.style.width = `${95 / numPlanets}%`

        for (let j: number = 0; j < numTimePeriods; j++) { //adds all the planets
            //creates the box for the time period
            let timePeriodBox: HTMLElement = document.createElement('div')
            timePeriodBox.classList.add("time-period-space")
            timePeriodBox.classList.add("time-period-box")
            timePeriodBox.id = `age-${j+1}-box`
            timePeriodBox.style.height = `${95 / numTimePeriods}%`
            timePeriodBox.addEventListener('click', () => { //adds the event to each time period box to select it
                if (n_selectedPlanetIndex === i && n_selectedTimePeriodIndex === j) {
                    n_selectedPlanetIndex = -1
                    n_selectedTimePeriodIndex = -1
                    timePeriodBox.style.borderColor = `black`
                    controlSection.style.display = `none`
                } else { //deselects the box if it was already selected
                    n_selectedPlanetIndex = i
                    n_selectedTimePeriodIndex = j
                    timePeriodBox.style.borderColor = `red`
                }
                DrawBoard()
            })

            if (n_selectedPlanetIndex === i && n_selectedTimePeriodIndex === j) { //check if this one is selected
                timePeriodBox.style.borderColor = `red` //if so: set the border to red
            }
            //add the info that should appear in the box
            if (pa_planets[i].ta_timePeriods[j].n_ownerIndex > -1) { //if it is owned by a player
                timePeriodBox.innerHTML = `<p>${pa_players[pa_planets[i].ta_timePeriods[j].n_ownerIndex].s_name}</p>` //TEMP: fill in their name
                //TODO: put their icon
            } else { //if time period is controlled by natives
                timePeriodBox.innerHTML = `<p>Uncolonized</p>` //TEMP: fill in "Uncolonized"
                //TODO: put uncolonized icon
            }

            planetColumn.appendChild(timePeriodBox) //adds the box to the column
        }

        timePeriodBoard.appendChild(planetColumn) //adds the planet column to the board
    }
    //#endregion Time Period Board

    //#region Selected Time Period Info Board
    if (n_selectedPlanetIndex != -1) {
        planetLine.innerHTML = `${pa_planets[n_selectedPlanetIndex].s_name}` //writes which planet is selected
        ageLine.innerHTML = `Age ${n_selectedTimePeriodIndex + 1}` //writes which time period is selected
        //writes the relevant info from the time period
        if (pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_ownerIndex === -1) { //checks if the time period is owner by a player
            ownerLine.innerHTML = `Owner: ${pa_planets[n_selectedPlanetIndex].s_name} natives` //if not: writes that it is owned by people from that planet
        } else {
            ownerLine.innerHTML = `Owner: ${pa_players[pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_ownerIndex].s_name}` //if so: writes the owner of the time period
        }
        powerLine.innerHTML = `Power Level: ${pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_level + pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_powerModifier}` //writes the power level of the time period to the label
        resourcesLine.innerHTML = `Resources: ${pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_resources}` //writes the number of resources in the time period
        resourceProductionLine.innerHTML = `Resource Production Rate: ${pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_resourceProduction}` //writes the resource production rate to the label
        buildingBox.innerHTML = `` //resets the text in the building box
        if (pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].ba_buildings.length > 0) { //checks if there are any buildings in the time period
            pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].ba_buildings.forEach((b) => buildingBox.innerHTML += `${b.s_name}<br>`) //if so: loops through them all and writes them to the box
        } else {
            buildingBox.innerHTML = `None` //if not: writes none to the list
        }
        troopBox.innerHTML = `` //resets the text in the troop box
        if (pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].aa_armies.length > 0) { //if there are any armies in the time period
            for (let i: number = 0; i < pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].aa_armies.length; i++) { //if so:loops through all of armies in the time period to be written out
                troopBox.innerHTML += TroopsString(pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].aa_armies[i], true)
            }
        } else {
            troopBox.innerHTML = `None` //if not: writes none to the list
        }
        presentPlayersBox.innerHTML = `` //resets the present players box
        let sa_presentPlayers: string[] = []
        pa_players.forEach((p) => { //goes through all the players and stores the names of the ones in the selected location
            if (p.na_location[0] === n_selectedPlanetIndex && p.na_location[1] === n_selectedTimePeriodIndex) {
                sa_presentPlayers.push(p.s_name)
            }
        })
        if (sa_presentPlayers.length > 0) {
            sa_presentPlayers.forEach((n) => presentPlayersBox.innerHTML += `${n}<br>`) //adds all the saved names to the list
        } else {
            presentPlayersBox.innerHTML = `None`
        }
        if (pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_ownerIndex === currentTurnIndex 
            && pa_players[currentTurnIndex].na_location[0] === n_selectedPlanetIndex
            && pa_players[currentTurnIndex].na_location[1] === n_selectedTimePeriodIndex) { //hides the controls if the player does not own the time period or is not there
            controlSection.style.display = `block`
        } else {
            controlSection.style.display = `none`
        }
        scorchedEarthButton.innerHTML = `Scorched Earth: ${pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].b_scorchedEarth ? "True" : "False"}`
        buildQueueBox.innerHTML = `` //resets the build queue box
        if (pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].boa_buildQueue.length > 0) {
            let i: number = 1
            pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].boa_buildQueue.forEach((bo) => {
                if (bo.tb_target.constructor === Troop) { //if next up is a troop
                    buildQueueBox.innerHTML += `${i++}> Troop: ${bo.tb_target.ToString()} Turns Remaining: ${bo.n_turnsRemaining}<br>`
                } else { //if next up is a building
                    buildQueueBox.innerHTML += `${i++}> Building: ${(bo.tb_target as Building).s_name} Turns Remaining: ${bo.n_turnsRemaining}<br>`
                }
            })
        } else {
            buildQueueBox.innerHTML = `None`
        }
        
    }  else {
        //resets the display values when deselecting
        planetLine.innerHTML = `No Planet Selected` //resets the time period age
        ageLine.innerHTML = `No Time Period Selected` //resets the time period age
        ownerLine.innerHTML = `Owner: ` //resets the owner of the time period
        powerLine.innerHTML = `Power Level: ` //resets the power level label
        resourcesLine.innerHTML = `Resources: ` //resets the number of resources in the time period
        resourceProductionLine.innerHTML = `Resource Production Rate: ` //resets the resource production rate label
        buildingBox.innerHTML = `` //resets the list of buildings
        troopBox.innerHTML = `` //resets the list of troops
        presentPlayersBox.innerHTML = `` //resets the present players box
        buildQueueBox.innerHTML = `` //resets the build queue box
    }
    //#endregion Selected Time Period Info Board

    //#region Players Board
    playerListBox.innerHTML = ``
    pa_players.forEach((p) => {
        //creates the string
        let playerHTML: string = `<div class="player-card">`
        if (p === pa_players[currentTurnIndex]) { //if p is the player whose turn it is
            playerHTML += `<h3>--[${p.s_name}]--</h3>` //adds the player's name with a star
        } else {
            playerHTML += `<h3>${p.s_name}</h3>` //adds the player's name without the star
        }
        if (p.na_location[0] === -1) { //adds the player's location if they have one
            playerHTML += `<h4>Location: Nowhere</h4>` //if they don't
        } else { //if they do
            playerHTML += `<h4>Location: ${pa_planets[p.na_location[0]].s_name} Age ${p.na_location[1] + 1}</h4>`
        }
        playerHTML += `<h3>Resources: ${p.n_resources}</h3>` //adds the player's resources
        playerHTML += `<div style="height:60px;border:3px solid #ccc;font:16px/26px Georgia, Garamond, Serif;overflow:auto;" class="player-list-troop-list-spot">` //starts the player's troop list
        playerHTML += TroopsString(p.a_troops, false) //adds their list of troops
        playerHTML += `</div>` //closes the trop list div
        playerHTML += `</div>` //closes the div
        playerListBox.innerHTML += playerHTML //adds the generated player card to the list
    })
    //#endregion Players Board

    //#region Current Player Info Board
    if (pa_players[currentTurnIndex].na_location[0] === -1) { //checks if the player has not yet gone to a time period
        locationSpot.innerHTML = `Location: Nowhere` //if so: show them as nowhere
    } else {
        locationSpot.innerHTML = `Location: ${pa_planets[pa_players[currentTurnIndex].na_location[0]].s_name} Age ${pa_players[currentTurnIndex].na_location[1] + 1}` //if not: write which planet and time period they are in
    }
    resourceSpot.innerHTML = `Resources: ${pa_players[currentTurnIndex].n_resources}` //fills in the line showing the player's resources
    if (pa_players[currentTurnIndex].a_troops.ta_troops.length > 0) { //checks if the player has any troops onboard
        troopListSpot.innerHTML = `${TroopsString(pa_players[currentTurnIndex].a_troops, false)}` //writes the player's TroopString to the box
    } else {
        troopListSpot.innerHTML = `None`//if not: writes none
    }
    if (!pa_players[currentTurnIndex].b_canMove) { //hides the travel button if the player does not have their travel action
        travelButton.style.display = `none`
    } else {
        travelButton.style.display = `inline`
    }
    if (!pa_players[currentTurnIndex].b_canTrade) { //hides the trade button if the player does not have their trade action
        tradeButton.style.display = `none`
    } else {
        tradeButton.style.display = `inline`
    }
    //#endregion Current Player Info Board
}

// TODO:
//  - Function to request the game state from the server
//  - Initialize
//  -- Request info from server and draw
//  - System to queue up orders and submit to server
//#endregion Main Game Logic