// data from the json files
let settings = require('./data/settings.json') // settings that the server are setup on
let responseFile = require('./data/responseFile.json') // file used to send something back to clients when a response is not needed

//----------------------------------------------
//--------------Tunable Values------------------
//----------------------------------------------

//#region Tunable Values
// These all come in from the settings
const numPlanets: number = settings.Game.numPlanets //number of planets that the game should have
const numTimePeriods: number = settings.Game.numTimePeriods //stores how many time periods each planet should have

const maxModifierFactor: number = settings.Game.maxModifierFactor //how high should the variance between time periods be allowed to get
const baseResourceProduction: number = settings.Game.baseResourceProduction //base number of resource generation that each time period generates
const resourceRateAdjuster: number = settings.Game.resourceRateAdjuster //number that the inverted modifier is multiplied by to make the differences between the resource production of different time periods substantial
const warehouseBonusPercent: number = settings.Game.warehouseBonusPercent //percent added to one of increase of resources if time period has a warehouse
const resourceGenPropagates: boolean = settings.Game.resourceGenPropagates //should resources added to a time period by normal resource gen propagate. Added because in testing, resource numbers got out of control

const trainTroopCost: number = settings.Game.trainTroopCost //how many resources should it cost to train a troop
const latenessFactor: number = settings.Game.latenessFactor //by what factor should later time period resources be reduced

const darkAges: boolean = settings.Game.darkAges //should dark ages be in play and affect power values

const troopTrainBaseTime: number = settings.Game.troopTrainBaseTime //how long it takes to train a troop by default
const trainingCampDiscount: number = settings.Game.trainingCampDiscount //how many turns the training camp reduces troop training by
const healthRecoveryPercent: number = settings.Game.healthRecoveryPercent //how much health do troops recover per turn
const fortressProtectionPercent: number = settings.Game.fortressProtectionPercent //how much damage do troops take if they are in a fortress

const buildingCost: number = settings.Game.buildingCost //how much it costs to build a building
const buildingTime: number = settings.Game.buildingTime //how many turns it takes to build a building
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

const Combat = (a1: Army, a2: Army, fortress: number = 0): void => { //carries out combat between 2 armies. if one of the armies is the defender and has a fortress, the fortress number will be 1 or 2
    //both armies are sorted
    a1.ta_troops = SortTroops(a1.ta_troops)
    a2.ta_troops = SortTroops(a2.ta_troops)
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

const shufflePlayers = (p_playerArray: Player[]): Player[] => {
    let outArray: Player[] = [] //declare array for shuffled players

    while (p_playerArray.length > 0) {
        let index: number = Math.floor(Math.random() * p_playerArray.length) //randomly pick the index to take
        outArray.push(p_playerArray[index]) //add that player to the list
        p_playerArray.splice(index, 1)
    }

    return outArray //return shuffled array
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
        this.a_troops = new Army(c_index, [new Troop(1, 0), new Troop(1, 0)]) //TEMP: not sure what troops players will start with if any
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
    }

    EndTurn = (): void => {
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

class Army { //a group of fighting units as well a number to store which player owns it

    n_ownerIndex: number
    ta_troops: Troop[]

    constructor (c_ownerIndex: number, c_troops: Troop[]) {
        this.n_ownerIndex = c_ownerIndex
        this.ta_troops = c_troops
    }

    DoIntegration = (currentTimePeriodLevel: number): void => { //goes through troop and runs integration
        this.ta_troops.forEach((t) => {
            //console.log(t.ToString()) //TEMP:
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
        this.b_hasCombat = false //resets has combat to false so if no combat takes place it is properly marked
        if (this.b_conquested) { //if the time period was conquested in the previous turn, now pass on the propagation order
            pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders.push(new ConquestPropagationOrder(true, this.n_ownerIndex, this.n_resources, this.ba_buildings, this.aa_armies)) //create propagation order in next time period
            this.b_conquested = false //clear the boolean for if it was just conquested so that a new propagation order is not passed on next turn
        }
        if (this.aa_armies.length === 1) { //if there is only one army in the time period
            if (this.aa_armies[this.aa_armies.length -1].n_ownerIndex != this.n_ownerIndex) { //if the owner of the only army is different from the owner of the time period, that army conquers the time period
                this.n_ownerIndex = this.aa_armies[0].n_ownerIndex //sets the new owner
                if (p_tIndex !== numTimePeriods - 1) { //makes sure that this time period is not the last in the list
                    pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders = [] //clears the propagation orders of the next time period as the conquest makes them redundant
                    this.b_conquested = true
                }
                this.b_propagationBlocked = true //conquest creates a propagation block
            }
        } else { //if there is more than one army, they do combat
            let hasFortress: boolean = false
            this.ba_buildings.forEach((b) => {
                if (b.bt_type === 2) { //if the building is a fortress
                    hasFortress = true
                }
            })
            for (let i: number = 0; i < this.aa_armies.length - 1; i++) { //loops through the armies
                if (this.aa_armies[i].n_ownerIndex === this.n_ownerIndex) { //if the current army is the army of the time period
                    for (let j: number = i + 1; j < this.aa_armies.length; j++) {
                        Combat(this.aa_armies[i], this.aa_armies[j], (1 * (hasFortress ? 1 : 0))) //has the troops of those armies fight each other. if there is a fortress, feed 1 into the fortress parameter, if not feed 0
                    }
                } else {
                    for (let j: number = i + 1; j < this.aa_armies.length; j++) {
                        if (this.aa_armies[j].n_ownerIndex === this.n_ownerIndex) { //if the current second army is the army of the time period
                            Combat(this.aa_armies[i], this.aa_armies[j], (2 * (hasFortress ? 1 : 0))) //has the troops of those armies fight each other. if there is a fortress, feed 2 into the fortress parameter, if not feed 0
                        } else { //if neither army is the army oif the time period
                            Combat(this.aa_armies[i], this.aa_armies[j]) //has the troops of those armies fight each other
                        }
                    }
                }
            }
            this.b_hasCombat = true
            CleanArmies() //removes empty armies
            if (this.aa_armies.length === 1 && this.aa_armies[this.aa_armies.length -1].n_ownerIndex != this.n_ownerIndex) { //if only one army remains, that player's army conquers the time period
                this.n_ownerIndex = this.aa_armies[0].n_ownerIndex //sets the new owner
                if (p_tIndex !== numTimePeriods - 1) { //makes sure that this time period is not the last in the list
                    pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders = [] //clears the propagation orders of the next time period as the conquest makes them redundant
                    this.b_conquested = true
                }
                this.b_propagationBlocked = true //conquest creates a propagation block
            }
        }
    }

    DoIntegration = (): void => { //goes through every army and runs integration
        this.aa_armies.forEach((a) => (a as Army).DoIntegration(this.n_rawLevel))
    }

    DoRecovery = (): void => { //goes through every army and runs recovery if there was no combat
        if (!this.b_hasCombat) {
            this.aa_armies.forEach((a) => a.DoRecovery())
        }
    }

    DoPropagation = (p_pIndex: number, p_tIndex: number): void => {
        if (!this.b_hasCombat) { //only does propagation if there is no combat
            this.pa_propagationOrders.forEach((po) => {
                if (po.constructor === ResourcePropagationOrder) { //handles resource propagation orders
                    if (po.b_adding && !pa_planets[p_pIndex].ta_timePeriods[p_tIndex].b_scorchedEarth) { //if the order is to add and the previous time period is not scorched earth
                        this.n_resources += po.n_amount
                    } else { //if the order is to remove
                        this.n_resources -= po.n_amount
                            if (this.n_resources < 0) { //makes sure resources don't drop below 0
                                this.n_resources = 0
                            }
                    }
                    //adds a new propagation order for the next time period to continue the propagation down the timeline
                    if (p_tIndex !== pa_planets[p_pIndex].ta_timePeriods.length - 1) { //checks if this is not the last time periods
                        pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders.push(new ResourcePropagationOrder(po.b_adding, po.n_amount)) //add the new propagation order, manually copied, to the next time period
                    }
                }
                if (po.constructor === TroopPropagationOrder && !this.b_propagationBlocked) { //handles troop propagation orders if this time period is not propagation blocked
                    if (po.b_adding) { //if the troop is being added
                        //this.aa_armies[0].ta_troops.push(po.t_target) //adds the troop
                        this.aa_armies[0].ta_troops.push((po.t_target as Troop)) //adds the troop
                        this.aa_armies[0].ta_troops[this.aa_armies[0].ta_troops.length - 1].ProgressIntegration(this.n_rawLevel) //increases the level of the troop before the propagation order is passed on but after it has been added so that when it is processed in the next time period it is already the proper level
                        this.aa_armies[0].ta_troops = SortTroops(this.aa_armies[0].ta_troops) //sorts the army with the new troop
                    } else { //if the troop is being removed
                        for (let i: number = 0; i < this.aa_armies[0].ta_troops.length; i++) {
                            if (this.aa_armies[0].ta_troops[i].n_level + this.aa_armies[0].ta_troops[i].n_modifier === po.t_target.n_level + po.t_target.n_modifier) {
                                this.aa_armies[0].ta_troops = this.aa_armies[0].ta_troops.filter((t) => t !== this.aa_armies[0].ta_troops[i]) //removes the troop that matches
                                break //exits the loop so only one troop is removed
                            } //if no troop matches, none are removed
                        }
                    }
                    //adds a new propagation order for the next time period to continue the propagation down the timeline
                    if (p_tIndex !== pa_planets[p_pIndex].ta_timePeriods.length - 1) { //checks if this is not the last time periods
                        pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders.push(new TroopPropagationOrder(po.b_adding, po.t_target)) //add the new propagation order, manually copied, to the next time period
                    }
                }
                if (po.constructor === BuildingPropagationOrder && !this.b_propagationBlocked) { //handles building propagation orders if this time period is not propagation blocked
                    if ((po as BuildingPropagationOrder).b_adding) { //if the building is being added
                        this.ba_buildings.push((po as BuildingPropagationOrder).b_target) //adds the building
                    } else { //if the building is being removed
                        for (let i: number = 0; i < this.ba_buildings.length; i++) {
                            if (this.ba_buildings[i] === (po as BuildingPropagationOrder).b_target) {
                                this.ba_buildings = this.ba_buildings.filter((b) => b !== this.ba_buildings[i]) //removes the building that matches
                                break //exits the loop so only one building is removed
                            } //if no building matches, none are removed
                        }
                    }
                    //adds a new propagation order for the next time period to continue the propagation down the timeline
                    if (p_tIndex !== pa_planets[p_pIndex].ta_timePeriods.length - 1) { //checks if this is not the last time periods
                        pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders.push(new BuildingPropagationOrder(po.b_adding, po.b_target)) //add the new propagation order, manually copied, to the next time period
                    }
                }
                if (po.constructor === ConquestPropagationOrder && !this.b_propagationBlocked) { //handles conquest propagation orders if this time period is not propagation blocked
                    //override the various attributes
                    this.n_ownerIndex = po.n_newOwnerIndex
                    this.n_resources = po.n_newResources
                    this.ba_buildings = po.ba_newBuildings
                    this.aa_armies = po.aa_newArmies
                    this.aa_armies.forEach((a) => a.DoIntegration(this.n_rawLevel)) //integrates the armies so they are the proper level when propagated to the next time period
                    //adds a new propagation order for the next time period to continue the propagation down the timeline
                    if (p_tIndex !== pa_planets[p_pIndex].ta_timePeriods.length - 1) { //checks if this is not the last time periods
                        pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders.push(new ConquestPropagationOrder(po.b_adding, po.n_newOwnerIndex, po.n_newResources, po.ba_newBuildings, po.aa_newArmies)) //add the new propagation order, manually copied, to the next time period
                    }
                }
            })
        }
        this.pa_propagationOrders = [] //clears out the propagation order list when they have all been done
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
        //console.log(`Integrating ${this.s_name}`) //TEMP:
        this.ta_timePeriods.forEach((tp) => (tp as TimePeriod).DoIntegration())
    }

    DoRecovery = (): void => {
        this.ta_timePeriods.forEach((tp) => tp.DoRecovery())
    }

    DoPropagation = (p_pIndex: number): void => {
        for (let i: number = this.ta_timePeriods.length - 1; i >= 0; i--) { //does propagation for all time periods in reverse order
            this.ta_timePeriods[i].DoPropagation(p_pIndex, i)
        }
    }
}
//#endregion Classes

//----------------------------------------------
//-------------MAIN GAME LOGIC------------------
//----------------------------------------------

//#region Main Game Logic
let pa_players: Player[] = [] //stores the list of players in the game

for (let i: number = 0; i < 5; i++) {  //TEMP:
    const testPlayer: Player = new Player(i, `Test Player ${i+1}`)
    pa_players.push(testPlayer)
}

let currentTurnIndex: number //stores which player is currently up

const pa_planets: Planet[] = [] //stores the list of the planets in play
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
    response.send("Server Page")
})

// opens the server on the specified port
app.listen(settings.Server.Port, () => {
    console.log(`Listen on the port ${settings.Server.Port}`)
})
//TODO:
// - app.get for the game state for the client to initialize

//#endregion Main Server Logic