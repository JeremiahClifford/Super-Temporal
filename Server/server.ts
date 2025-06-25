import { json } from "stream/consumers"

// data from the json files
let settings = require('./data/settings.json') // settings that the server are setup on
let playerListJSON = require('./data/playerList.json') // list of players that will be in the game
let responseFile = require('./data/responseFile.json')

//----------------------------------------------
//--------------Tunable Values------------------
//----------------------------------------------

//#region Tunable Values
// These all come in from the settings
const numPlanets: number = settings.Game.numPlanets // number of planets that the game should have
const numTimePeriods: number = settings.Game.numTimePeriods // stores how many time periods each planet should have

const maxModifierFactor: number = settings.Game.maxModifierFactor // how high should the variance between time periods be allowed to get
const baseResourceProduction: number = settings.Game.baseResourceProduction // base number of resource generation that each time period generates
const resourceRateAdjuster: number = settings.Game.resourceRateAdjuster // number that the inverted modifier is multiplied by to make the differences between the resource production of different time periods substantial
const warehouseBonusPercent: number = settings.Game.warehouseBonusPercent // percent added to one of increase of resources if time period has a warehouse
const resourceGenPropagates: boolean = settings.Game.resourceGenPropagates // should resources added to a time period by normal resource gen propagate. Added because in testing, resource numbers got out of control

const trainTroopCost: number = settings.Game.trainTroopCost // how many resources should it cost to train a troop
const latenessFactor: number = settings.Game.latenessFactor // by what factor should later time period resources be reduced

const darkAges: boolean = settings.Game.darkAges // should dark ages be in play and affect power values

const troopTrainBaseTime: number = settings.Game.troopTrainBaseTime // how long it takes to train a troop by default
const trainingCampDiscount: number = settings.Game.trainingCampDiscount // how many turns the training camp reduces troop training by
const healthRecoveryPercent: number = settings.Game.healthRecoveryPercent // how much health do troops recover per turn
const fortressProtectionPercent: number = settings.Game.fortressProtectionPercent // how much damage do troops take if they are in a fortress

const buildingCost: number = settings.Game.buildingCost // how much it costs to build a building
const buildingTime: number = settings.Game.buildingTime // how many turns it takes to build a building
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

const CleanArmies = (): void => { //loops through every time zone and removes any empty time zones. runs every time the game draw
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

const Combat = (a1: Army, a2: Army, fortress: number = 0): void => { // carries out combat between 2 armies. if one of the armies is the defender and has a fortress, the fortress number will be 1 or 2
    //both armies are sorted
    a1.ta_troops = SortTroops(a1.ta_troops)
    a2.ta_troops = SortTroops(a2.ta_troops)
    if (a1.ta_troops.length <= 0 || a2.ta_troops.length <= 0) { // makes sure both armies have troops
        return // if not, end combat
    }
    switch (fortress) {
        case 0: //neither army has a fortress
            //both troops deal damage to each other
            a1.ta_troops[0].n_health -= (a2.ta_troops[0].n_level + a2.ta_troops[0].n_modifier)
            a2.ta_troops[0].n_health -= (a1.ta_troops[0].n_level + a1.ta_troops[0].n_modifier)
            //remove dead troops
            if (a1.ta_troops[0].n_health <= 0) {
                a1.ta_troops = a1.ta_troops.filter((t) => t != a1.ta_troops[0])
            }
            if (a2.ta_troops[0].n_health <= 0) {
                a2.ta_troops = a2.ta_troops.filter((t) => t != a2.ta_troops[0])
            }
            break;
        case 1: //army 1 has the fortress
            //both troops deal damage to each other
            a1.ta_troops[0].n_health -= (a2.ta_troops[0].n_level + a2.ta_troops[0].n_modifier) * fortressProtectionPercent //army 1 takes less damage because they have a fortress
            a2.ta_troops[0].n_health -= (a1.ta_troops[0].n_level + a1.ta_troops[0].n_modifier)
            //remove dead troops
            if (a1.ta_troops[0].n_health <= 0) {
                a1.ta_troops = a1.ta_troops.filter((t) => t != a1.ta_troops[0])
            }
            if (a2.ta_troops[0].n_health <= 0) {
                a2.ta_troops = a2.ta_troops.filter((t) => t != a2.ta_troops[0])
            }
            break;
        case 2: //army 2 has the fortress
            //both troops deal damage to each other
            a1.ta_troops[0].n_health -= (a2.ta_troops[0].n_level + a2.ta_troops[0].n_modifier)
            a2.ta_troops[0].n_health -= (a1.ta_troops[0].n_level + a1.ta_troops[0].n_modifier) * fortressProtectionPercent //army 2 takes less damage because they have a fortress
            //remove dead troops
            if (a1.ta_troops[0].n_health <= 0) {
                a1.ta_troops = a1.ta_troops.filter((t) => t != a1.ta_troops[0])
            }
            if (a2.ta_troops[0].n_health <= 0) {
                a2.ta_troops = a2.ta_troops.filter((t) => t != a2.ta_troops[0])
            }
            break;
    }
}

const SelectPlanetName = (): string => { // selects a name from the list of options and returns it if it is unused. if it is used it returns a new name recursively. called when creating planets at initialization.
    let availablePlanetNames = settings.planet_names // get the list of possible planet names from the settings file

    let selectedName: string = availablePlanetNames[Math.floor(Math.random() * availablePlanetNames.length)]    
    for (let i: number = 0; i < pa_planets.length; i++) {
        if (selectedName === pa_planets[i].s_name) {
            return SelectPlanetName()
        }
    }
    return selectedName
}
//#endregion Helper Functions

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
        this.a_troops = new Army(c_index, [new Troop(1, 0.5), new Troop(1, 0.5)]) // TEMP: not sure what troops players will start with if any
        this.n_resources = 0
        this.na_location = [-1, -1]

        this.b_canMove = false
        this.b_canTrade = false
    }

    HealTroops = (): void => {
        this.a_troops.ta_troops.forEach((t) => t.n_health = t.n_level + t.n_modifier)
    }

    StartTurn = (): void => {
        this.b_canMove = true
        this.b_canTrade = true

        console.log(`Turn Started`) //LOG:
    }

    EndTurn = (): void => {
        this.b_canMove = false
        this.b_canTrade = false

        console.log(`Turn Ended`) //LOG:
    }
}

class Troop { // represents 1 fighting unit

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

    ProgressIntegration = (c_currentTimePeriodLevel: number): void => {
        if (this.n_rawLevel < c_currentTimePeriodLevel) {
            this.n_health /= (this.n_level + this.n_modifier) //reduce the health to the percentage of the max
            this.n_modifier /= Math.pow(2, this.n_rawLevel)
            this.n_rawLevel++
            this.n_level = Math.pow(2, this.n_rawLevel)
            this.n_modifier *= Math.pow(2, this.n_rawLevel)
            this.n_health *= (this.n_level + this.n_modifier) //remultiply by the new max health to get the integrated health
        }
    }

    Recover = (): void => {
        if (this.n_health < this.n_level + this.n_modifier) {
            this.n_health += (this.n_level * healthRecoveryPercent)
        }
        if (this.n_health > this.n_level + this.n_modifier) {
            this.n_health = this.n_level + this.n_modifier
        }
    }

    ToString = (): string => {
        return `Level: ${this.n_level + this.n_modifier}`
    }
}

class Army { // a group of fighting units as well a number to store which player owns it

    n_ownerIndex: number
    ta_troops: Troop[]

    constructor (c_ownerIndex: number, c_troops: Troop[]) {
        this.n_ownerIndex = c_ownerIndex
        this.ta_troops = c_troops
    }

    DoIntegration = (currentTimePeriodLevel: number): void => { //goes through troop and runs integration
        this.ta_troops.forEach((t) => {
            t.ProgressIntegration(currentTimePeriodLevel)
        })
    }

    DoRecovery = (): void => {
        this.ta_troops.forEach((t) => {
            t.Recover()
        })
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
        
        // manually copy over the troop
        this.t_target = new Troop(c_target.n_rawLevel, c_target.n_modifier, c_target.n_health)
        this.t_target.n_id = c_target.n_id // sets the target id to the proper id
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
    n_newResources: number // resources from the time period that originated the propagation order that overrides the resources
    ba_newBuildings: Building[] // building list from the time period that originated the propagation order that overrides the building list
    aa_newArmies: Army[] // army list from the time period that originated the propagation order that overrides the army list

    constructor (c_adding: boolean, c_newOwnerIndex: number, c_newResources: number, c_newBuildings: Building[], c_newArmies: Army[]) {
        super(c_adding)

        this.n_newOwnerIndex = c_newOwnerIndex
        this.n_newResources = c_newResources
        // manually copy over the buildings array
        this.ba_newBuildings = []
        for (let i: number = 0; i < c_newBuildings.length; i++) {
            this.ba_newBuildings.push(new Building(c_newBuildings[i].bt_type, c_newBuildings[i].s_name))
        }
        // manually copy over the armies array
        this.aa_newArmies = []
        for (let i: number = 0; i < c_newArmies.length; i++) {
            // copy over the troops array of the armies
            let ta_newTroops: Troop[] = []
            for (let j: number = 0; j < c_newArmies[i].ta_troops.length; j++) {
                ta_newTroops.push(new Troop(c_newArmies[i].ta_troops[j].n_rawLevel, c_newArmies[i].ta_troops[j].n_modifier, c_newArmies[i].ta_troops[j].n_health))
                ta_newTroops[ta_newTroops.length-1].n_id = c_newArmies[i].ta_troops[j].n_id // sets the newly added troop's id to the correct id
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
        this.n_rawLevel = c_level
        this.n_level = Math.pow(2, this.n_rawLevel)
        this.n_rawModifierFactor = c_modifierFactor
        this.n_powerModifier = c_modifierFactor * this.n_level
        if (darkAges) {
            this.n_powerModifier *= Math.abs(c_darkAgeValue) / 2
        }
        if (this.n_powerModifier < 1) { //truncates the troop power modifier to 2 decimals if less than one or whole number if more than zero to keep things tidy
            this.n_powerModifier = Math.round(this.n_powerModifier * 100) * 0.01
        } else {
            this.n_powerModifier = Math.round(this.n_powerModifier)
        }
        this.n_resourceProduction = baseResourceProduction * (1 + ((maxModifierFactor - c_modifierFactor) * resourceRateAdjuster)) - (c_level * latenessFactor) //sets the resource production bonus to the inverse of the troop power bonus to balance time periods that have good troops with lower resource production
        if (darkAges) {
            this.n_resourceProduction *= Math.abs(c_darkAgeValue) / 2
        }
        this.n_resourceProduction = Math.round(this.n_resourceProduction * 100) * 0.01 //truncates the resource modifier to 2 decimals
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

    GenerateResources = (p_pIndex: number, p_tIndex: number): void => {
        this.ba_buildings.forEach((b) => { //check all buildings in this time period
            if (b.bt_type === 1) { //if there is a warehouse
                this.n_resources += (this.n_resourceProduction * (warehouseBonusPercent + 1.0)) //produce increased resources
                return //and exit function
            }
        })
        this.n_resources += this.n_resourceProduction //otherwise produce normal resources
        if (resourceGenPropagates) { //check the rule for if resource gen should propagate
            if (p_tIndex !== numTimePeriods - 1) { //makes sure that this time period is not the last in the list
                pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders.push(new ResourcePropagationOrder(true, this.n_resourceProduction))
            }
        }
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
        this.boa_buildQueue.push(new BuildOrder(new Building(p_type), buildingTime))
    }

    ProgressBuildQueue = (p_pIndex: number, p_tIndex: number): void => {
        if (this.boa_buildQueue.length > 0) { //makes sure to run the progression only if there is something in the queue
            this.boa_buildQueue[0].n_turnsRemaining-- //reduces the turns remaining by 1
            if (this.boa_buildQueue[0].n_turnsRemaining <= 0) { //if the build order has no turns remaining
                if (this.boa_buildQueue[0].tb_target.constructor === Troop) { //if a troop is being trained
                    //finds which army, if any, is the owner's
                    let ownerArmyIndex: number = -1
                    for (let i: number = 0; i < this.aa_armies.length; i++) {
                        if (this.aa_armies[i].n_ownerIndex === this.n_ownerIndex) {
                            ownerArmyIndex = i
                        }
                    }
                    //add the troop to the army
                    if (ownerArmyIndex > -1) { //if the owner has an army present
                        this.aa_armies[ownerArmyIndex].ta_troops.push(this.boa_buildQueue[0].tb_target as Troop) //add the troop
                    } else { //if they don't
                        this.aa_armies.push(new Army(this.n_ownerIndex, [])) //Make one
                        ownerArmyIndex = this.aa_armies.length -1 //set the owner index
                        this.aa_armies[ownerArmyIndex].ta_troops.push(this.boa_buildQueue[0].tb_target as Troop) //add the troop
                    }
                    if (p_tIndex !== numTimePeriods - 1) { //makes sure that this time period is not the last in the list
                        pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders.push(new TroopPropagationOrder(true, new Troop(this.boa_buildQueue[0].tb_target.n_rawLevel, this.boa_buildQueue[0].tb_target.n_modifier))) //create propagation order in next time period
                    }
                } else { //if a building is being built
                    this.ba_buildings.push(this.boa_buildQueue[0].tb_target as Building) //add the building
                    if (p_tIndex !== numTimePeriods - 1) { //makes sure that this time period is not the last in the list
                        pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders.push(new BuildingPropagationOrder(true, this.boa_buildQueue[0].tb_target as Building)) //creates the propagation order in the next time period
                    }
                }
                this.boa_buildQueue.shift() //remove the completed build from the queue
            }
        }
    }

    DoCombat = (p_pIndex: number, p_tIndex: number): void => {
        this.b_hasCombat = false // resets has combat to false so if no combat takes place it is properly marked
        if (this.b_conquested) { // if the time period was conquested in the previous turn, now pass on the propagation order
            pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders.push(new ConquestPropagationOrder(true, this.n_ownerIndex, this.n_resources, this.ba_buildings, this.aa_armies)) // create propagation order in next time period
            this.b_conquested = false // clear the boolean for if it was just conquested so that a new propagation order is not passed on next turn
        }
        if (this.aa_armies.length === 1) { // if there is only one army in the time period
            if (this.aa_armies[this.aa_armies.length -1].n_ownerIndex != this.n_ownerIndex) { // if the owner of the only army is different from the owner of the time period, that army conquers the time period
                this.n_ownerIndex = this.aa_armies[0].n_ownerIndex // sets the new owner
                if (p_tIndex !== numTimePeriods - 1) { // makes sure that this time period is not the last in the list
                    pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders = [] // clears the propagation orders of the next time period as the conquest makes them redundant
                    this.b_conquested = true
                }
                this.b_propagationBlocked = true // conquest creates a propagation block
            }
        } else { // if there is more than one army, they do combat
            let hasFortress: boolean = false
            this.ba_buildings.forEach((b) => {
                if (b.bt_type === 2) { // if the building is a fortress
                    hasFortress = true
                }
            })
            for (let i: number = 0; i < this.aa_armies.length - 1; i++) { // loops through the armies
                if (this.aa_armies[i].n_ownerIndex === this.n_ownerIndex) { // if the current army is the army of the time period
                    for (let j: number = i + 1; j < this.aa_armies.length; j++) {
                        Combat(this.aa_armies[i], this.aa_armies[j], (1 * (hasFortress ? 1 : 0))) // has the troops of those armies fight each other. if there is a fortress, feed 1 into the fortress parameter, if not feed 0
                    }
                } else {
                    for (let j: number = i + 1; j < this.aa_armies.length; j++) {
                        if (this.aa_armies[j].n_ownerIndex === this.n_ownerIndex) { // if the current second army is the army of the time period
                            Combat(this.aa_armies[i], this.aa_armies[j], (2 * (hasFortress ? 1 : 0))) // has the troops of those armies fight each other. if there is a fortress, feed 2 into the fortress parameter, if not feed 0
                        } else { // if neither army is the army of the time period
                            Combat(this.aa_armies[i], this.aa_armies[j]) // has the troops of those armies fight each other
                        }
                    }
                }
            }
            this.b_hasCombat = true
            CleanArmies() // removes empty armies
            if (this.aa_armies.length === 1 && this.aa_armies[this.aa_armies.length - 1].n_ownerIndex !== this.n_ownerIndex) { // if only one army remains, that player's army conquers the time period
                this.n_ownerIndex = this.aa_armies[0].n_ownerIndex // sets the new owner
                if (p_tIndex !== numTimePeriods - 1) { // makes sure that this time period is not the last in the list
                    pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders = [] // clears the propagation orders of the next time period as the conquest makes them redundant
                    this.b_conquested = true
                }
                this.b_propagationBlocked = true // conquest creates a propagation block
                this.b_hasCombat = false // sets combat back to false if the combat is fully resolved
            }
            if (this.aa_armies.length === 0) { // if there are no armies
                this.b_hasCombat = false // remove the combat flag
            }
        }
    }

    DoIntegration = (): void => { // goes through every army and runs integration
        this.aa_armies.forEach((a) => (a as Army).DoIntegration(this.n_rawLevel))
    }

    DoRecovery = (): void => { // goes through every army and runs recovery if there was no combat
        if (!this.b_hasCombat) {
            this.aa_armies.forEach((a) => a.DoRecovery())
        }
    }

    DoPropagation = (p_pIndex: number, p_tIndex: number): void => {
        // TEMP: Testing | if (!this.b_hasCombat) { // only does propagation if there is no combat
        if (!pa_planets[p_pIndex].ta_timePeriods[p_tIndex - 1].b_hasCombat) { // only does propagation if the previous time period does not have combat
            this.pa_propagationOrders.forEach((po) => {
                if (po.constructor === ResourcePropagationOrder) { // handles resource propagation orders
                    if (po.b_adding && !pa_planets[p_pIndex].ta_timePeriods[p_tIndex].b_scorchedEarth) { // if the order is to add and the previous time period is not scorched earth
                        this.n_resources += po.n_amount
                    } else { // if the order is to remove
                        this.n_resources -= po.n_amount
                            if (this.n_resources < 0) { // makes sure resources don't drop below 0
                                this.n_resources = 0
                            }
                    }
                    // adds a new propagation order for the next time period to continue the propagation down the timeline
                    if (p_tIndex !== pa_planets[p_pIndex].ta_timePeriods.length - 1) { // checks if this is not the last time periods
                        pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders.push(new ResourcePropagationOrder(po.b_adding, po.n_amount)) // add the new propagation order, manually copied, to the next time period
                    }
                }
                if (po.constructor === TroopPropagationOrder && !this.b_propagationBlocked) { // handles troop propagation orders if this time period is not propagation blocked
                    if (po.b_adding) { // if the troop is being added
                        if (this.aa_armies.length === 0) { // if there is no army to put the troops in
                            this.aa_armies.push(new Army(this.n_ownerIndex, [])) // add an army to put the troop in
                        }
                        this.aa_armies[0].ta_troops.push((po.t_target as Troop)) // adds the troop
                        this.aa_armies[0].ta_troops[this.aa_armies[0].ta_troops.length - 1].ProgressIntegration(this.n_rawLevel) // increases the level of the troop before the propagation order is passed on but after it has been added so that when it is processed in the next time period it is already the proper level
                        this.aa_armies[0].ta_troops = SortTroops(this.aa_armies[0].ta_troops) // sorts the army with the new troop
                    } else { // if the troop is being removed
                        for (let i: number = 0; i < this.aa_armies[0].ta_troops.length; i++) {
                            if (this.aa_armies[0].ta_troops[i].n_id === po.t_target.n_id) {
                                this.aa_armies[0].ta_troops = this.aa_armies[0].ta_troops.filter((t) => t.n_id !== po.t_target.n_id) // removes the troop that matches
                            } // if no troop matches, none are removed
                        }
                    }
                    // adds a new propagation order for the next time period to continue the propagation down the timeline
                    if (p_tIndex !== pa_planets[p_pIndex].ta_timePeriods.length - 1) { // checks if this is not the last time periods
                        pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders.push(new TroopPropagationOrder(po.b_adding, po.t_target)) // add the new propagation order, manually copied, to the next time period
                    }
                }
                if (po.constructor === BuildingPropagationOrder && !this.b_propagationBlocked) { // handles building propagation orders if this time period is not propagation blocked
                    if ((po as BuildingPropagationOrder).b_adding) { // if the building is being added
                        this.ba_buildings.push((po as BuildingPropagationOrder).b_target) // adds the building
                    } else { // if the building is being removed
                        for (let i: number = 0; i < this.ba_buildings.length; i++) {
                            if (this.ba_buildings[i] === (po as BuildingPropagationOrder).b_target) {
                                this.ba_buildings = this.ba_buildings.filter((b) => b !== this.ba_buildings[i]) //removes the building that matches
                                break // exits the loop so only one building is removed
                            } // if no building matches, none are removed
                        }
                    }
                    // adds a new propagation order for the next time period to continue the propagation down the timeline
                    if (p_tIndex !== pa_planets[p_pIndex].ta_timePeriods.length - 1) { // checks if this is not the last time periods
                        pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders.push(new BuildingPropagationOrder(po.b_adding, po.b_target)) // add the new propagation order, manually copied, to the next time period
                    }
                }
                if (po.constructor === ConquestPropagationOrder && !this.b_propagationBlocked) { // handles conquest propagation orders if this time period is not propagation blocked
                    // override the various attributes
                    this.n_ownerIndex = po.n_newOwnerIndex
                    this.n_resources = po.n_newResources
                    this.ba_buildings = po.ba_newBuildings
                    this.aa_armies = po.aa_newArmies
                    this.aa_armies.forEach((a) => a.DoIntegration(this.n_rawLevel)) // integrates the armies so they are the proper level when propagated to the next time period
                    // adds a new propagation order for the next time period to continue the propagation down the timeline
                    if (p_tIndex !== pa_planets[p_pIndex].ta_timePeriods.length - 1) { // checks if this is not the last time periods
                        pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders.push(new ConquestPropagationOrder(po.b_adding, po.n_newOwnerIndex, po.n_newResources, po.ba_newBuildings, po.aa_newArmies)) // add the new propagation order, manually copied, to the next time period
                    }
                }
            })
        }
        this.pa_propagationOrders = [] // clears out the propagation order list when they have all been done
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

    DoResourceGen = (p_pIndex: number): void => { //runs resource gen for every time period
        let n_tIndex: number = 0
        this.ta_timePeriods.forEach((tp) => tp.GenerateResources(p_pIndex, n_tIndex++))
    }

    ProgressBuildQueues = (p_pIndex: number): void => { //runs the build queue for every time period
        let n_tIndex: number = 0
        this.ta_timePeriods.forEach((tp) => tp.ProgressBuildQueue(p_pIndex, n_tIndex++))
    }

    DoCombat = (p_pIndex: number): void => { //goes through every time period and does combat
        let tIndex: number = 0
        this.ta_timePeriods.forEach((tp) => tp.DoCombat(p_pIndex, tIndex++))
    }
    
    DoIntegration = (): void => { //goes through every time period and runs integration
        this.ta_timePeriods.forEach((tp) => (tp as TimePeriod).DoIntegration())
    }

    DoRecovery = (): void => {
        this.ta_timePeriods.forEach((tp) => tp.DoRecovery())
    }

    DoPropagation = (p_pIndex: number): void => {
        for (let i: number = this.ta_timePeriods.length - 1; i > 0; i--) { //does propagation for all time periods in reverse order
            this.ta_timePeriods[i].DoPropagation(p_pIndex, i)
        }
    }
}
//#endregion Classes

//----------------------------------------------
//-----------------Trading----------------------
//----------------------------------------------

//#region Trading
const Trade = (p: number, tp: number, rTaken: number, rGiven: number, tTaken: Troop[], tGiven: Troop[]): void => {
    let playerArmyIndex: number = -1
    for (let i: number = 0; i < pa_planets[p].ta_timePeriods[tp].aa_armies.length; i++) { // finds if the player already has an army in this time period
        if (pa_planets[p].ta_timePeriods[tp].aa_armies[i].n_ownerIndex === currentTurnIndex) {
            playerArmyIndex = i
        }
    }
    if (playerArmyIndex === -1) { // if player does not have an  army in this time period creates one to use. if not used, it will be cleaned next time the game draws
        playerArmyIndex = pa_planets[p].ta_timePeriods[tp].aa_armies.length
        pa_planets[p].ta_timePeriods[tp].aa_armies.push(new Army(currentTurnIndex, []))
    }

    if (playerArmyIndex > -1) { // if they have an army here
        // swaps all the things around
        //gives the player the resources they take
        pa_players[currentTurnIndex].n_resources += rTaken
        pa_planets[p].ta_timePeriods[tp].n_resources -= rTaken
        if (tp !== pa_planets[p].ta_timePeriods.length - 1) { // checks if this is not the last time periods
            pa_planets[p].ta_timePeriods[tp + 1].pa_propagationOrders.push(new ResourcePropagationOrder(false, rTaken)) // add the propagation order to propagate the trade results in next time period
        }
        // gives the time period the resources it has been given
        pa_planets[p].ta_timePeriods[tp].n_resources += rGiven
        pa_players[currentTurnIndex].n_resources -= rGiven
        if (tp !== pa_planets[p].ta_timePeriods.length - 1) { // checks if this is not the last time periods
            pa_planets[p].ta_timePeriods[tp + 1].pa_propagationOrders.push(new ResourcePropagationOrder(true, rGiven)) // add the propagation order to propagate the trade results in next time period
        }
        // moves the taken troops to the player
        tTaken.forEach((t) => {
            pa_players[currentTurnIndex].a_troops.ta_troops.push(t)
            if (tp !== pa_planets[p].ta_timePeriods.length - 1) { // checks if this is not the last time periods
                pa_planets[p].ta_timePeriods[tp + 1].pa_propagationOrders.push(new TroopPropagationOrder(false, t)) // add the propagation order to propagate the trade results in next time period
            }
            for (let i: number = 0; i < pa_planets[p].ta_timePeriods[tp].aa_armies[playerArmyIndex].ta_troops.length; i++) { // go through the time period's troops and remove the matching troop
                if (pa_planets[p].ta_timePeriods[tp].aa_armies[playerArmyIndex].ta_troops[i].n_id === t.n_id) {
                    pa_planets[p].ta_timePeriods[tp].aa_armies[playerArmyIndex].ta_troops = pa_planets[p].ta_timePeriods[tp].aa_armies[playerArmyIndex].ta_troops.filter((t) => t.n_id !== pa_planets[p].ta_timePeriods[tp].aa_armies[playerArmyIndex].ta_troops[i].n_id)
                }
            }
        })
        pa_players[currentTurnIndex].a_troops.ta_troops = SortTroops(pa_players[currentTurnIndex].a_troops.ta_troops)
        // moves the given troops to the time period
        tGiven.forEach((t) => {
            pa_planets[p].ta_timePeriods[tp].aa_armies[playerArmyIndex].ta_troops.push(t)
            if (tp !== pa_planets[p].ta_timePeriods.length - 1) { // checks if this is not the last time periods
                pa_planets[p].ta_timePeriods[tp + 1].pa_propagationOrders.push(new TroopPropagationOrder(true, t)) // add the propagation order to propagate the trade results in next time period
            }
            for (let i: number = 0; i < pa_players[currentTurnIndex].a_troops.ta_troops.length; i++) { // go through the player's troops and remove the matching troop
                if (pa_players[currentTurnIndex].a_troops.ta_troops[i].n_id === t.n_id) {
                    pa_players[currentTurnIndex].a_troops.ta_troops = pa_players[currentTurnIndex].a_troops.ta_troops.filter((t) => t.n_id !== pa_players[currentTurnIndex].a_troops.ta_troops[i].n_id)
                }
            }
        })
        pa_planets[p].ta_timePeriods[tp].aa_armies[playerArmyIndex].ta_troops = SortTroops(pa_planets[p].ta_timePeriods[tp].aa_armies[playerArmyIndex].ta_troops)

        console.log(`Trade Made`) // LOG:
    } else { //if they don't have an army here
        //This should never happen as an empty army is created when the trade window is filled in if none is found
    }
}
//#endregion Trading

//----------------------------------------------
//-------------MAIN GAME LOGIC------------------
//----------------------------------------------

//#region Main Game Logic
let pa_players: Player[] = [] // stores the list of players in the game

for (let i: number = 0; i < playerListJSON.Players.length; i++) {
    const playerIn: Player = new Player(i, playerListJSON.Players[i])
    pa_players.push(playerIn)
}

let currentTurnIndex: number // stores which player is currently up

const pa_planets: Planet[] = [] // stores the list of the planets in play

const AdvanceTurn = (): void => { // ends the current turn and starts the next one

    pa_players[currentTurnIndex].EndTurn() // removes any unused action from the player ending their turn

    if (currentTurnIndex === (pa_players.length - 1)) { // advances the player whose turn it is by on, making sure to loop around once at the end
        console.log(`Performing end of turn cycle calculations`) // LOG:
        pa_players.forEach((p) => p.HealTroops()) // heals the troops on the ships of all players
        let pIndex = 0;
        pa_planets.forEach((p) => {
            p.DoResourceGen(pIndex) // run resource gen for each planet
            p.ProgressBuildQueues(pIndex) // runs the build queues for all the planets
            p.DoCombat(pIndex) // runs combat for all the planets
            p.DoIntegration() // runs integration for all the planets
            p.DoRecovery() // runs recovery for all planets
            p.DoPropagation(pIndex) // runs propagation for all planets
            pIndex++ // increments the pIndex so the next planet has the correct index
        })
        currentTurnIndex = 0 // loops around at the end of a full turn cycle
    } else {
        currentTurnIndex++ // moves the turn to the next player
    }

    pa_players[currentTurnIndex].StartTurn() // sets the current player up so they have their actions
}

const Initialize = (): void => {
    currentTurnIndex = 0

    pa_players[currentTurnIndex].StartTurn() // sets the current player up so they have their actions

    for (let i: number = 0; i < numPlanets; i++) { // creates the list of planets of the number specified in the tunable values
        let darkAgePoint: number = Math.floor((Math.random() * Math.floor(numTimePeriods / 3)) + Math.floor(numTimePeriods / 3))
        if (numPlanets > settings.planet_names.length) { // makes sure that name selection wont crash
            pa_planets.push(new Planet(`Planet ${i+1}`, darkAgePoint)) // if it will, name them by index
        } else {
            pa_planets.push(new Planet(SelectPlanetName(), darkAgePoint)) // if it wont, select names from the list randomly
        }
    }
}
//#endregion Main Game Logic

//----------------------------------------------
//------------MAIN SERVER LOGIC-----------------
//----------------------------------------------

//#region Main Server Logic
// express server setup
const express = require("express")
const bodyParser = require('body-parser')
const app = express()

const fs = require('fs')

// settings to make data parsing and connecting work
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(function (request: any, response: any, next: any) {
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    response.setHeader('Access-Control-Allow-Credentials', true)
    next()
})

// default response
app.get("/", (request: any, response: any) => {
    response.send("Server is running")
})

app.post("/login", (request: any, response: any) => {
    const infoSubmitted = request.body

    console.log(`Client attempting to connect : ${infoSubmitted.Username}`)
    let clientConnected: boolean = false

    responseFile.index = -1 // sets the response index to default -1 so the client can fail the login
    for (let i: number = 0; i < playerListJSON.Players.length; i++) { // loop through usernames registered for this game
        if (JSON.stringify(infoSubmitted.Username).toLowerCase() === JSON.stringify(playerListJSON.Players[i]).toLowerCase()) { // if the player trying to login matches a registered player
            responseFile.index = i // set the response index to the player's index

            clientConnected = true
            console.log(`${playerListJSON.Players[i]} has connected`)
        }
    }
    if (!clientConnected) {
        console.log(`Client failed to connect`)
    }
    response.json(responseFile) // send the response to the client
})

app.get("/gamestate", (request: any, response: any) => {
    let gamestateOut: string = ``

    gamestateOut += `{` // file open
    
    // players
    gamestateOut += `"numPlayers": ${pa_players.length},` // for the client to know how long to loop when loading in the players
    gamestateOut += `"players": [` // players open
    for (let i: number = 0; i < pa_players.length; i++) { // loop through all players
        gamestateOut += `{` // specific player open
        // Fill in the Player Data
        // Fill in the rest of the player data
        gamestateOut += `"name": "${pa_players[i].s_name}",`
        
        // Troops
        gamestateOut += `"troops": [` // troops open
        // Troop data
        for (let j: number = 0; j < pa_players[i].a_troops.ta_troops.length; j++) { // loop through the troops in the army of the current player
            gamestateOut += `{` // specific troop open

            gamestateOut += `"rawLevel": ${pa_players[i].a_troops.ta_troops[j].n_rawLevel},`
            gamestateOut += `"level": ${pa_players[i].a_troops.ta_troops[j].n_level},`
            gamestateOut += `"modifier": ${pa_players[i].a_troops.ta_troops[j].n_modifier},`
            gamestateOut += `"health": ${pa_players[i].a_troops.ta_troops[j].n_health},`
            gamestateOut += `"id": ${pa_players[i].a_troops.ta_troops[j].n_id}`

            gamestateOut += `${j === pa_players[i].a_troops.ta_troops.length-1 ? "}" : "},"}` // specific troop close | if its the last one, leave out the trailing comma
        }
        gamestateOut += `],` // troops close

        gamestateOut += `"resources": ${pa_players[i].n_resources},`
        gamestateOut += `"canMove": "${pa_players[i].b_canMove ? 1 : 0}",`
        gamestateOut += `"canTrade": "${pa_players[i].b_canTrade ? 1 : 0}",`

        gamestateOut += `"location": [` // location open
        gamestateOut += `${pa_players[i].na_location[0]},`
        gamestateOut += `${pa_players[i].na_location[1]}`
        gamestateOut += `]` // location close

        gamestateOut += `${i === pa_players.length-1 ? "}" : "},"}` // specific player close | if its the last one, leave out the trailing comma
    }
    gamestateOut +=  `],` // players close
    
    // tunable values
    gamestateOut += `"currentTurnIndex": ${currentTurnIndex},`
    gamestateOut += `"numPlanets": ${numPlanets},`
    gamestateOut += `"numTimePeriods": ${numTimePeriods},`
    gamestateOut += `"warehouseBonusPercent": ${warehouseBonusPercent},`
    gamestateOut += `"trainTroopCost": ${trainTroopCost},`
    gamestateOut += `"troopTrainBaseTime": ${troopTrainBaseTime},`
    gamestateOut += `"trainingCampDiscount": ${trainingCampDiscount},`
    gamestateOut += `"healthRecoveryPercent": ${healthRecoveryPercent},`
    gamestateOut += `"fortressProtectionPercent": ${fortressProtectionPercent},`
    gamestateOut += `"buildingCost": ${buildingCost},`
    gamestateOut += `"buildingTime":  ${buildingTime},`

    // planets
    gamestateOut += `"planets": [` // planets open
    for (let i: number = 0; i < pa_planets.length; i++) { // loop through all planets
        gamestateOut += `{` // specific planet open
        // Fill in planet data
        gamestateOut += `"name": "${pa_planets[i].s_name}",`

        gamestateOut += `"time_periods": [` // time periods open
        for (let j: number = 0; j < pa_planets[i].ta_timePeriods.length; j++) { // loop through all time periods
            gamestateOut += `{` // specific time period open
            
            // Fill in time periods data
            gamestateOut += `"ownerIndex": ${pa_planets[i].ta_timePeriods[j].n_ownerIndex},`
            gamestateOut += `"rawLevel": ${pa_planets[i].ta_timePeriods[j].n_rawLevel},`
            gamestateOut += `"level": ${pa_planets[i].ta_timePeriods[j].n_level},`
            gamestateOut += `"rawModifierFactor": ${pa_planets[i].ta_timePeriods[j].n_rawModifierFactor},`
            gamestateOut += `"powerModifier": ${pa_planets[i].ta_timePeriods[j].n_powerModifier},`
            gamestateOut += `"resources": ${pa_planets[i].ta_timePeriods[j].n_resources},`
            gamestateOut += `"resourceProduction": ${pa_planets[i].ta_timePeriods[j].n_resourceProduction},`
            gamestateOut += `"darkAgeValue": ${pa_planets[i].ta_timePeriods[j].n_darkAgeValue},`
            
            // Buildings
            gamestateOut += `"buildings": [` // buildings open
            for (let k: number = 0; k < pa_planets[i].ta_timePeriods[j].ba_buildings.length; k++) {
                gamestateOut += `{` // specific building open

                gamestateOut += `"name": "${pa_planets[i].ta_timePeriods[j].ba_buildings[k].s_name}",`
                gamestateOut += `"type": ${pa_planets[i].ta_timePeriods[j].ba_buildings[k].bt_type.valueOf()}`

                gamestateOut += `${k === pa_planets[i].ta_timePeriods[j].ba_buildings.length-1 ? "}" : "},"}` // specific building close | if its the last one, leave out the trailing comma
            }
            gamestateOut += `],` // buildings close

            // Armies
            gamestateOut += `"armies": [` // armies open
            for (let k: number = 0; k < pa_planets[i].ta_timePeriods[j].aa_armies.length; k++) {
                gamestateOut += `{` // specific army open

                gamestateOut += `"owner_index": ${pa_planets[i].ta_timePeriods[j].aa_armies[k].n_ownerIndex},`
                
                gamestateOut += `"troops": [` // troops open
                for (let m: number = 0; m < pa_planets[i].ta_timePeriods[j].aa_armies[k].ta_troops.length; m++) {
                    gamestateOut += `{` // specific troop open

                    gamestateOut += `"rawLevel": ${pa_planets[i].ta_timePeriods[j].aa_armies[k].ta_troops[m].n_rawLevel},`
                    gamestateOut += `"level": ${pa_planets[i].ta_timePeriods[j].aa_armies[k].ta_troops[m].n_level},`
                    gamestateOut += `"modifier": ${pa_planets[i].ta_timePeriods[j].aa_armies[k].ta_troops[m].n_modifier},`
                    gamestateOut += `"health": ${pa_planets[i].ta_timePeriods[j].aa_armies[k].ta_troops[m].n_health},`
                    gamestateOut += `"id": ${pa_planets[i].ta_timePeriods[j].aa_armies[k].ta_troops[m].n_id}`
        
                    gamestateOut += `${m === pa_planets[i].ta_timePeriods[j].aa_armies[k].ta_troops.length-1 ? "}" : "},"}` // specific troop close | if its the last one, leave out the trailing comma
                }
                gamestateOut += `]` // troops close

                gamestateOut += `${k === pa_planets[i].ta_timePeriods[j].aa_armies.length-1 ? "}" : "},"}` // specific army close | if its the last one, leave out the trailing comma
            }
            gamestateOut += `],` // armies close
            
            // Build orders
            gamestateOut += `"build_orders": [` // build orders open

            for (let k: number = 0; k < pa_planets[i].ta_timePeriods[j].boa_buildQueue.length; k++) {
                gamestateOut += `{` // specific build order open

                gamestateOut += `"type": "${pa_planets[i].ta_timePeriods[j].boa_buildQueue[k].tb_target.constructor.name}",`
                
                gamestateOut += `"target": {` // target open
                if (pa_planets[i].ta_timePeriods[j].boa_buildQueue[k].tb_target.constructor === Building) { // if its a building
                    gamestateOut += `"name": "${(pa_planets[i].ta_timePeriods[j].boa_buildQueue[k].tb_target as Building).s_name}",`
                    gamestateOut += `"type": ${(pa_planets[i].ta_timePeriods[j].boa_buildQueue[k].tb_target as Building).bt_type.valueOf()}`
                }
                if (pa_planets[i].ta_timePeriods[j].boa_buildQueue[k].tb_target.constructor === Troop) { // if its a troop
                    gamestateOut += `"rawLevel": ${(pa_planets[i].ta_timePeriods[j].boa_buildQueue[k].tb_target as Troop).n_rawLevel},`
                    gamestateOut += `"level": ${(pa_planets[i].ta_timePeriods[j].boa_buildQueue[k].tb_target as Troop).n_level},`
                    gamestateOut += `"modifier": ${(pa_planets[i].ta_timePeriods[j].boa_buildQueue[k].tb_target as Troop).n_modifier},`
                    gamestateOut += `"health": ${(pa_planets[i].ta_timePeriods[j].boa_buildQueue[k].tb_target as Troop).n_health},`
                    gamestateOut += `"id": ${(pa_planets[i].ta_timePeriods[j].boa_buildQueue[k].tb_target as Troop).n_id}`
                }
                gamestateOut += `},` // target close

                gamestateOut += `"turns_remaining": ${pa_planets[i].ta_timePeriods[j].boa_buildQueue[k].n_turnsRemaining}`

                gamestateOut += `${k === pa_planets[i].ta_timePeriods[j].boa_buildQueue.length-1 ? "}" : "},"}` // specific build order close | if its the last one, leave out the trailing comma
            }

            gamestateOut += `],` // build orders close

            gamestateOut += `"hasCombat": ${pa_planets[i].ta_timePeriods[j].b_hasCombat},`
            gamestateOut += `"propagationBlocked": ${pa_planets[i].ta_timePeriods[j].b_propagationBlocked},`
            gamestateOut += `"conquested": ${pa_planets[i].ta_timePeriods[j].b_conquested},`
            gamestateOut += `"scorchedEarth": ${pa_planets[i].ta_timePeriods[j].b_scorchedEarth}`

            gamestateOut += `${j === pa_planets[i].ta_timePeriods.length-1 ? "}" : "},"}` // specific time period close | if its the last one, leave out the trailing comma
        }
        gamestateOut += `]` // time periods close
        
        gamestateOut += `${i === pa_planets.length-1 ? "}" : "},"}` // specific planet close | if its the last one, leave out the trailing comma
    }
    gamestateOut += `]` // planets close

    gamestateOut += `}` // file close

    response.send(JSON.stringify(gamestateOut))
})

// submit function
app.post("/submitturn", (request: any, response: any) => {
    // ingests the data
    const turnSubmitted = JSON.parse(JSON.stringify(request.body))

    console.log(`Turn Submitted: ${JSON.stringify(turnSubmitted)}`) // log the submitted turn in the console

    if (turnSubmitted.Details[0].CurrentTurnIndex === currentTurnIndex) { // check the player that is submitting the move. Details[0] is always the player index
        for (let i: number = 1; i < turnSubmitted.Details.length; i++) { // loop through the actions. length will always be 1 to 3 depending on if the player does both possible actions on there turn or just one or none
            // check if action is move or trade
            if (turnSubmitted.Details[i].Type === "Move") { // if its a move
                pa_players[currentTurnIndex].b_canMove = false // takes the player's move action on the server
                pa_players[currentTurnIndex].na_location = [turnSubmitted.Details[i].NewLocation[0], turnSubmitted.Details[i].NewLocation[1]] // moves the player on the server
                console.log(`Player Moved`) // LOG:
            }
            if (turnSubmitted.Details[i].Type === "Trade") { // if its a trade
                // read in the list of troops taken
                let troopsTaken: Troop[] = []
                for (let j: number = 0; j < turnSubmitted.Details[i].TroopsTaken.length; j++) {
                    let newTroop: Troop = new Troop(turnSubmitted.Details[i].TroopsTaken[j].rawLevel, turnSubmitted.Details[i].TroopsTaken[j].modifier, turnSubmitted.Details[i].TroopsTaken[j].health) // create the troop using the read in details
                    // fill in some extra details of the troop
                    newTroop.n_level = turnSubmitted.Details[i].TroopsTaken[j].level
                    newTroop.n_id = turnSubmitted.Details[i].TroopsTaken[j].id

                    troopsTaken.push(newTroop) // add the new troop to the list
                }
                // read in the list of troops given
                let troopsGiven: Troop[] = []
                for (let j: number = 0; j < turnSubmitted.Details[i].TroopsGiven.length; j++) {
                    let newTroop: Troop = new Troop(turnSubmitted.Details[i].TroopsGiven[j].rawLevel, turnSubmitted.Details[i].TroopsGiven[j].modifier, turnSubmitted.Details[i].TroopsGiven[j].health) // create the troop using the read in details
                    // fill in some extra details of the troop
                    newTroop.n_level = turnSubmitted.Details[i].TroopsGiven[j].level
                    newTroop.n_id = turnSubmitted.Details[i].TroopsGiven[j].id

                    troopsGiven.push(newTroop) // add the new troop to the list
                }
                console.log(`Trading`) // LOG:
                console.log(`  Troops Taken: ${JSON.stringify(troopsTaken)}`) // LOG:
                console.log(`  Troops Given: ${JSON.stringify(troopsGiven)}`) // LOG:
                console.log(`  Resources Taken: ${JSON.stringify(turnSubmitted.Details[i].ResourcesTaken)}`) // LOG:
                console.log(`  Resources Given: ${JSON.stringify(turnSubmitted.Details[i].ResourcesGiven)}`) // LOG:
                Trade(turnSubmitted.Details[i].TargetTimePeriod[0], turnSubmitted.Details[i].TargetTimePeriod[1], turnSubmitted.Details[i].ResourcesTaken, turnSubmitted.Details[i].ResourcesGiven, troopsTaken, troopsGiven) // execute the trade
            }
            if (turnSubmitted.Details[i].Type === "Build") { // if its a build
                pa_planets[turnSubmitted.Details[i].Planet].ta_timePeriods[turnSubmitted.Details[i].TimePeriod].n_resources -= buildingCost // takes the cost
                pa_planets[turnSubmitted.Details[i].Planet].ta_timePeriods[turnSubmitted.Details[i].TimePeriod].StartBuilding(turnSubmitted.Details[i].BuildingType) // starts the building
            }
            if (turnSubmitted.Details[i].Type === "Train") { // if its a training
                pa_planets[turnSubmitted.Details[i].Planet].ta_timePeriods[turnSubmitted.Details[i].TimePeriod].StartTroopTraining() // starts training a troop
                pa_planets[turnSubmitted.Details[i].Planet].ta_timePeriods[turnSubmitted.Details[i].TimePeriod].n_resources -= trainTroopCost // charges the train troop cost
            }
        }
        console.log(`Turn Completed`) // LOG:
        
        AdvanceTurn() // end the player's turn and move to the next player

        responseFile.responseValue = true
    } else { // player index does not match
        responseFile.responseValue = false
    }
    console.log(`Sending Response: ${JSON.stringify(responseFile)}`) // LOG:
    response.json(responseFile) // sends the response to the client
    console.log(`Response Sent`) //LOG:
})

//#endregion Main Server Logic

Initialize() // Initializes the game when the server starts up

// opens the server on the specified port
app.listen(settings.Server.Port, () => {
    console.log(`Listen on the port ${settings.Server.Port}`)
})