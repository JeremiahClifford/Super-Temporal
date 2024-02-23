//----------------------------------------------
//--------------Tunable Values------------------
//----------------------------------------------

const numPlanets: number = 5 //number of planets that the game should have
const numTimePeriods: number = 10 //stores how many time periods each planet should have

const maxModifierFactor: number = 0.05 //how high should the variance between time periods be allowed to get
const baseResourceProduction: number = 10 //base number of resource generation that each time period generates
const resourceRateAdjuster: number = 10 //number that the inverted modifier is multiplied by to make the differences between the resource production of different time periods substantial

const gameBackgroundColor: string = "#03053c" //background color of the whole game

const boardBackgroundColor: string = "#e8e8e8" //color of the background of the various boards
const boardOutlineColor: string = "#2c2c2c" //color of the outline of the various boards

const trainTroopCost: number = 50 //how many resources should it cost to train a troop
const latenessFactor: number = 0.5 //by what factor should later time period resources be reduced

const darkAges: boolean = false //should dark ages be in play and affect power values

//----------------------------------------------
//--------------Helper Functions----------------
//----------------------------------------------

const SortTroops = (ta: Troop[]): Troop[] => { //sorts the troops of an army in descending order of power
    return ta.sort((a, b) => { //uses the built in sort method
        return (b.n_level + b.n_modifier) - (a.n_level + a.n_modifier)
    })
}

const TroopsString = (a: Army, useName: boolean): string => { //gives a string representation of the player's or time period's list of troops
    a.ta_troops = SortTroops(a.ta_troops) //sorts the troops so they are in a good order to be printed

    //squashes troops of the same level into 1 line
    //arrays to store the types of power level and how many of them there are
    let troopTypes: number[] = [] //types of level
    let troopHealth: number[] = []//health of the type
    let typeCounts: number[] = [] //number of each type

    for (let i: number = 0; i < a.ta_troops.length; i++) { //loops through the array and checks if this is the first of the power level
        if (troopTypes.indexOf(a.ta_troops[i].n_level + a.ta_troops[i].n_modifier) > -1) { //if not: increments the count for that power level
            for (let j: number = 0; j < troopTypes.length; j++) { //loops through the types to check them against the current troop being checked
                if (troopTypes[j] === a.ta_troops[i].n_level + a.ta_troops[i].n_modifier) { //TODO: make sure that troops are only considered the same type if the also have the same health
                    typeCounts[j]++
                }
            }
        } else {
            troopTypes.push(a.ta_troops[i].n_level + a.ta_troops[i].n_modifier) //if so: adds that level to the bottom on the list and gives it a count of 1
            troopHealth.push(a.ta_troops[i].n_health)
            typeCounts.push(1)
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
        output += `${typeCounts[i]}x Level: ${troopTypes[i]} Health: ${troopHealth[i]}<br>` //adds a line of their info to the output string
    }
    return output //returns the outputted list
}

const TroopCardList = (a: Army, taken: boolean, target: Army): string => { //takes an army and returns a string which is a list of all the individual troops with controls which are used on the trade screen to move them back and forth. If taken is true that means this list goes in the selected box. If taken is false, it is going in the present box. This changes what the button s say
    let output: HTMLElement = document.createElement('div') as HTMLElement //creates the div for the list of troop cards
    output.className = 'troop-card-list' //gives the div a class

    for (let i: number = 0; i < a.ta_troops.length; i++) { //loops through all of the troops to give them each a card
        let troopCard: HTMLElement = document.createElement('div') as HTMLElement //creates the troop card for this troop
        troopCard.className = 'troop-card' //gives the troop card a class
        troopCard.innerHTML += `
                Level: ${a.ta_troops[i].n_level + a.ta_troops[i].n_modifier}
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

const Combat = (a1: Army, a2: Army): void => { //carries out combat between 2 armies
    //both armies are sorted
    a1.ta_troops = SortTroops(a1.ta_troops)
    a2.ta_troops = SortTroops(a2.ta_troops)
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
}

const DebugPlanets = (): void => { //function to print the info of all the planets to the console for debugging
    pa_planets.forEach((p) => {
        console.log(`${p.s_name}: `)
        console.log(` Time Periods:`)
        for (let i: number = 0; i < p.ta_timePeriods.length; i++) {
            console.log(`  Age ${i+1}:`)
            console.log(`   Owner Index: ${p.ta_timePeriods[i].n_ownerIndex}`)
            console.log(`   Raw Level: ${p.ta_timePeriods[i].n_rawLevel}`)
            console.log(`   Level: ${p.ta_timePeriods[i].n_level}`)
            console.log(`   Raw Modifier: ${p.ta_timePeriods[i].n_rawModifierFactor}`)
            if (darkAges) {
                console.log(`   Dark Age Value: ${p.ta_timePeriods[i].n_darkAgeValue}`)
            }
            console.log(`   Power Modifier: ${p.ta_timePeriods[i].n_powerModifier}`)
            console.log(`   Effective Level: ${p.ta_timePeriods[i].n_level + p.ta_timePeriods[i].n_powerModifier}`)
            console.log(`   Resources: ${p.ta_timePeriods[i].n_resources}`)
            console.log(`   Resource Production: ${p.ta_timePeriods[i].n_resourceProduction}`)
            console.log(`   Number of Armies: ${p.ta_timePeriods[i].aa_armies.length}`)
            console.log(`   Number of Buildings: ${p.ta_timePeriods[i].ba_buildings.length}`)
        }
    })
}

//----------------------------------------------
//------------------Classes---------------------
//----------------------------------------------

class Player {

    s_name: string
    a_troops: Army
    n_resources: number
    na_location: number[]

    b_canMove: boolean
    b_canTrade: boolean

    constructor (c_index: number, c_name: string) {
        this.s_name = c_name
        this.a_troops = new Army(c_index, [new Troop(1, 0), new Troop(1, 0.1), new Troop(1, 0)]) //TEMP: not sure what troops players will start with if any
        this.n_resources = 20
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

    constructor (c_level: number, c_modifier: number) {
        this.n_rawLevel = c_level
        this.n_level = Math.pow(2, this.n_rawLevel)
        this.n_modifier = c_modifier
        this.n_health = this.n_level + this.n_modifier
    }

    ProgressIntegration = (currentTimePeriodLevel: number): void => {
        if (currentTimePeriodLevel > this.n_rawLevel) {
            this.n_modifier /= Math.pow(2, this.n_rawLevel)
            this.n_rawLevel++
            this.n_level = Math.pow(2, this.n_rawLevel)
            this.n_modifier *= Math.pow(2, this.n_rawLevel)
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
            console.log(t.ToString())
            t.ProgressIntegration(currentTimePeriodLevel)
        })
    }
}

class Building {

    s_name: string

    constructor (c_name: string) {
        this.s_name = c_name
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
        
        this.t_target = c_target
    }

    ToString () {
        return `Type: Troop | Adding: ${this.b_adding} | Troop: ${(this.t_target as Troop).ToString()}`
    }
}

class BuildingPropagationOrder extends PropagationOrder {

    b_target: Building

    constructor (c_adding: boolean, c_target: Building) {
        super(c_adding)

        this.b_target = c_target
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
        this.ba_newBuildings = c_newBuildings
        this.aa_newArmies = c_newArmies
    }

    ToString () {
        return `Type: Conquest | Adding: ${this.b_adding} | New Owner: ${this.n_newOwnerIndex}`
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
    pa_propagationOrders: (ResourcePropagationOrder | TroopPropagationOrder | ConquestPropagationOrder)[]
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
        this.n_resources += this.n_resourceProduction
        if (p_tIndex !== numTimePeriods - 1) { //makes sure that this time period is not the last in the list
            pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders.push(new ResourcePropagationOrder(true, this.n_resourceProduction))
        }
    }

    StartTroopTraining = (): void  => {
        this.boa_buildQueue.push(new BuildOrder(new Troop(this.n_rawLevel, this.n_powerModifier)))
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
                        pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders.push(new TroopPropagationOrder(true, this.boa_buildQueue[0].tb_target)) //create propagation order in next time period
                    }
                } else { //if a building is being built
                    //TODO:
                    //TODO: create propagation order in next time period
                }
            }
            this.boa_buildQueue = this.boa_buildQueue.filter((bo) => bo !== this.boa_buildQueue[0]) //removes the completed build from the list
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
            for (let i: number = 0; i < this.aa_armies.length - 1; i++) { //loops through the armies
                for (let j: number = i + 1; j < this.aa_armies.length; j++) {
                    Combat(this.aa_armies[i], this.aa_armies[j]) //has the troops of those armies fight each other
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
        this.aa_armies.forEach((a) => a.DoIntegration(this.n_rawLevel))
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
                    console.log(`${(po as ResourcePropagationOrder).ToString()} completed`)
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
                }
                if (po.constructor === BuildingPropagationOrder && !this.b_propagationBlocked) { //handles building propagation orders if this time period is not propagation blocked
                    if ((po as BuildingPropagationOrder).b_adding) { //if the building is being added
                        this.ba_buildings.push((po as BuildingPropagationOrder).b_target) //adds the building
                    } else { //if the building is being removed
                        for (let i: number = 0; i < this.ba_buildings.length; i++) {
                            if (this.ba_buildings[i] === (po as BuildingPropagationOrder).b_target) {
                                this.ba_buildings = this.ba_buildings.filter((b) => b !== this.ba_buildings[i]) //removes the building that matches
                                break //exits the loop so only one building is removed
                            } //if no troop matches, none are removed
                        }
                    }
                }
                if (po.constructor === ConquestPropagationOrder && !this.b_propagationBlocked) { //handles conquest propagation orders if this time period is not propagation blocked
                    //override the various attributes
                    this.n_ownerIndex = po.n_newOwnerIndex
                    this.n_resources = po.n_newResources
                    this.ba_buildings = po.ba_newBuildings
                    po.aa_newArmies.forEach((a) => a.DoIntegration(this.n_level))
                    this.aa_armies = po.aa_newArmies
                    po.aa_newArmies.forEach((a) => a.DoIntegration(this.n_rawLevel + 1)) //integrates the armies so they are the proper level when propagated to the next time period
                }
                //adds a new propagation order for the next time period to continue the propagation down the timeline
                if (p_tIndex !== pa_planets[p_pIndex].ta_timePeriods.length - 1) { //checks if this is not the last time periods
                    pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders.push(po) //adds a copy of the propagation order to the next time zone
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
        console.log(`Integrating ${this.s_name}`)
        this.ta_timePeriods.forEach((tp) => tp.DoIntegration())
    }

    DoPropagation = (p_pIndex: number): void => {
        for (let i: number = this.ta_timePeriods.length - 1; i >= 0; i--) { //does propagation for all time periods in reverse order
            this.ta_timePeriods[i].DoPropagation(p_pIndex, i)
        }
    }
}

//----------------------------------------------
//-----------------Trading----------------------
//----------------------------------------------

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

const FillInTradeWindow = (p: number, t: TimePeriod): void => { //function which writes everything that is in the trade. This function runs every time something is changed in the trade tto update the UI

    tradingWindow.style.display = "block" //shows the trade window

    //fills in the time periods side
    //fills in the time period present
    //resets the text and adds a card for the resources in the time period
    if (t.n_ownerIndex === p) {
        timePeriodPresent.innerHTML = `
            <div class="resource-trade-card">
                <h4>Resources: ${t.n_resources}</h4>
                <input type="number" class="resource-select-input" id="time-period-present-resource-select-input">
                <button class="resource-select-button" id="time-period-present-resource-select-button" onclick="SwapResources(false, true)">Select</button>
            <div>
        `
    } else {
        timePeriodPresent.innerHTML = ``
    }
    let playerArmyIndex: number = -1 //the index at which the player's army in the time period is. -1 by default as they might not have an army
    for (let i: number = 0; i < t.aa_armies.length; i++) { //finds which army in the time period belongs to the player if any
        if (t.aa_armies[i].n_ownerIndex === p) {
            playerArmyIndex = i
        }
    }
    if (playerArmyIndex > -1) { //checks if the player has an army in the time period
        timePeriodPresent.innerHTML += TroopCardList(t.aa_armies[playerArmyIndex], false, troopsTaken)//if so: writes out the troops of that army
        for (let i = 0; i < t.aa_armies[playerArmyIndex].ta_troops.length; i++) { //gives the events to the buttons
            let selectButton: HTMLButtonElement = document.getElementById(`${false}-${p}-swap-button-${i}-${troopsTaken.n_ownerIndex}`) as HTMLButtonElement
            selectButton.addEventListener('click', () => {
                SwapTroop(t.aa_armies[playerArmyIndex], i, troopsTaken)
            })
        }
    } else {
        //if not: creates one to use. if not used, it will be cleaned next time the game draws
        t.aa_armies.push(new Army(p, []))
        playerArmyIndex = t.aa_armies.length - 1
    }
    //fills in the time period selected
    //resets the text and adds a card for the resources in the time period
    if (t.n_ownerIndex === p) {
        timePeriodForTrade.innerHTML = `
            <div class="resource-trade-card">
                <h4>Resources: ${resourcesTaken}</h4>
                <input type="number" class="resource-select-input" id="time-period-for-trade-resource-select-input">
                <button class="resource-select-button" id="time-period-for-trade-resource-select-button" onclick="SwapResources(false, false)">Select</button>
            <div>
        `
    } else {
        timePeriodForTrade.innerHTML = ``
    }
    timePeriodForTrade.innerHTML += TroopCardList(troopsTaken, true, t.aa_armies[playerArmyIndex])
    for (let i: number = 0; i < troopsTaken.ta_troops.length; i++) { //gives the events to the buttons
        let selectButton: HTMLButtonElement = document.getElementById(`${true}-${troopsTaken.n_ownerIndex}-swap-button-${i}-${p}`) as HTMLButtonElement
        selectButton.addEventListener('click', () => {
            SwapTroop(troopsTaken, i, t.aa_armies[playerArmyIndex])
        })
    }

    //fills in the player side
    //fills in the player present
    //resets the text and adds a card for the resources that the player has onboard
    if (t.n_ownerIndex === p) {
        playerPresent.innerHTML = `
            <div class="resource-trade-card">
                <h4>Resources: ${pa_players[p].n_resources}</h4>
                <input type="number" class="resource-select-input" id="player-present-resource-select-input">
                <button class="resource-select-button" id="player-present-resource-select-button" onclick="SwapResources(true, true)">Select</button>
            <div>
        `
    } else {
        playerPresent.innerHTML = ``
    }
    playerPresent.innerHTML += TroopCardList(pa_players[p].a_troops, false, troopsGiven)
    for (let i = 0; i < pa_players[p].a_troops.ta_troops.length; i++) { //gives the events to the buttons
        let selectButton: HTMLButtonElement = document.getElementById(`${false}-${p}-swap-button-${i}-${troopsGiven.n_ownerIndex}`) as HTMLButtonElement
        selectButton.addEventListener('click', () => {
            SwapTroop(pa_players[p].a_troops, i, troopsGiven)
        })
    }
    //fills in the player selected
    //resets the text and adds a card for the resources in the time period
    if (t.n_ownerIndex === p) {
        playerForTrade.innerHTML = `
            <div class="resource-trade-card">
                <h4>Resources: ${resourcesGiven}</h4>
                <input type="number" class="resource-select-input" id="player-for-trade-resource-select-input">
                <button class="resource-select-button" id="player-for-trade-resource-select-button" onclick="SwapResources(true, false)">Select</button>
            <div>
        `
    } else {
        playerForTrade.innerHTML = ``
    }
    
    playerForTrade.innerHTML += TroopCardList(troopsGiven, true, pa_players[p].a_troops)
    for (let i: number = 0; i < troopsGiven.ta_troops.length; i++) { //gives the events to the buttons
        let selectButton: HTMLButtonElement = document.getElementById(`${true}-${troopsGiven.n_ownerIndex}-swap-button-${i}-${p}`) as HTMLButtonElement
        selectButton.addEventListener('click', () => {
            SwapTroop(troopsGiven, i, pa_players[p].a_troops)
        })
    }
}

const CloseTradeWindow = (p: number, tp: TimePeriod): void => { //cancels a trade in progress and hides the window
    tradingWindow.style.display = "none" //hides the trade window
    pa_players[p].b_canTrade = true //gives the player their trade action back
    //moves all of the selected things back where they came from
    //returns the player's resources
    pa_players[p].n_resources += resourcesGiven
    resourcesGiven = 0
    //returns the time periods resources
    tp.n_resources += resourcesTaken
    resourcesTaken = 0
    //returns the player's troops and sorts their army
    troopsGiven.ta_troops.forEach((t) => pa_players[p].a_troops.ta_troops.push(t))
    pa_players[p].a_troops.ta_troops = SortTroops(pa_players[p].a_troops.ta_troops)
    troopsGiven.ta_troops = []
    //returns the time period's troops and sorts their army
    let playerArmyIndex: number = -1 //the index at which the player's army in the time period is. -1 by default as they might not have an army
    for (let i: number = 0; i < tp.aa_armies.length; i++) { //finds which army in the time period belongs to the player if any
        if (tp.aa_armies[i].n_ownerIndex === p) {
            playerArmyIndex = i
        }
    }
    if (playerArmyIndex > -1) { //checks if the player has an army in the time period
        //if so: returns the troops and sorts the army
        troopsTaken.ta_troops.forEach((t) => tp.aa_armies[playerArmyIndex].ta_troops.push(t))
        tp.aa_armies[playerArmyIndex].ta_troops = SortTroops(tp.aa_armies[playerArmyIndex].ta_troops)
        troopsTaken.ta_troops = []
    }

    DrawBoard()
}

const SwapResources = (player: boolean, present: boolean): void => { //moves resources from one box to another
    if (player) { //if the swap should be in the player section
        if (present) { //if the swap should be from the present section to the selected section
            let numInput: HTMLInputElement = document.getElementById('player-present-resource-select-input') as HTMLInputElement
            if (numInput.value) { //makes sure that a number of resources is set by the player
                if (+numInput.value <= pa_players[currentTurnIndex].n_resources ) { //makes sure the player can take more resources then there are
                    resourcesGiven += +numInput.value
                    pa_players[currentTurnIndex].n_resources -= +numInput.value 
                } else {
                    resourcesGiven += pa_players[currentTurnIndex].n_resources
                    pa_players[currentTurnIndex].n_resources = 0
                }
            }
        } else { //if the swap should be from the selected section to the present section
            let numInput: HTMLInputElement = document.getElementById('player-for-trade-resource-select-input') as HTMLInputElement
            if (numInput.value) { //makes sure that a number of resources is set by the player
                if (+numInput.value <= resourcesGiven) { //makes sure the player can take more resources then there are
                    resourcesGiven -= +numInput.value
                    pa_players[currentTurnIndex].n_resources += +numInput.value
                } else {
                    pa_players[currentTurnIndex].n_resources += resourcesGiven
                    resourcesGiven = 0
                }
            }
        }
    } else {
        if (present) { //if the swap should be from the present section to the selected section
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
        } else { //if the swap should be from the selected section to the present section
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
    FillInTradeWindow(currentTurnIndex, pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex]) //redraws the trade window
}

const SwapTroop = (start: Army, startIndex: number, target: Army): void => { //WIP: not quite working properly
    target.ta_troops.push(start.ta_troops[startIndex]) //adds the troops to the target
    target.ta_troops = SortTroops(target.ta_troops) //sorts the target
    start.ta_troops =  start.ta_troops.filter((t) => t !== start.ta_troops[startIndex]) //removes the troop from where it started
    FillInTradeWindow(currentTurnIndex, pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex]) //redraws the trade window
}

const Trade = (p: number, tp: TimePeriod, p_pIndex: number, p_tIndex: number): void => { //function to move troops and resources between a player's ship and a time period given and taken are form the player's perspective. P is the index in pa_players of the player doing the trading
    tradingWindow.style.display = "none" //hides the trade window

    let playerArmyIndex: number = -1
    for (let i: number = 0; i < tp.aa_armies.length; i++) { //finds if the player already has an army in this time period
        if (tp.aa_armies[i].n_ownerIndex === p) {
            playerArmyIndex = i
        }
    }
    if (playerArmyIndex > -1) { //if they have an army here
        //swaps all the things around
        //gives the player the resources they take
        pa_players[p].n_resources += resourcesTaken
        if (p_tIndex !== pa_planets[p_pIndex].ta_timePeriods.length - 1) { //checks if this is not the last time periods
            pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders.push(new ResourcePropagationOrder(false, resourcesTaken)) //add the propagation order to propagate the trade results in next time period
        }
        resourcesTaken = 0
        //gives the time period the resources it has been given
        tp.n_resources += resourcesGiven
        if (p_tIndex !== pa_planets[p_pIndex].ta_timePeriods.length - 1) { //checks if this is not the last time periods
            pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders.push(new ResourcePropagationOrder(true, resourcesGiven)) //add the propagation order to propagate the trade results in next time period
        }
        resourcesGiven = 0
        //moves the taken troops to the player
        troopsTaken.ta_troops.forEach((t) => {
            pa_players[p].a_troops.ta_troops.push(t)
            if (p_tIndex !== pa_planets[p_pIndex].ta_timePeriods.length - 1) { //checks if this is not the last time periods
                pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders.push(new TroopPropagationOrder(false, t)) //add the propagation order to propagate the trade results in next time period
            }
        })
        pa_players[p].a_troops.ta_troops = SortTroops(pa_players[p].a_troops.ta_troops)
        troopsTaken.ta_troops = []
        //moves the given troops to the time period
        troopsGiven.ta_troops.forEach((t) => {
            tp.aa_armies[playerArmyIndex].ta_troops.push(t)
            if (p_tIndex !== pa_planets[p_pIndex].ta_timePeriods.length - 1) { //checks if this is not the last time periods
                pa_planets[p_pIndex].ta_timePeriods[p_tIndex + 1].pa_propagationOrders.push(new TroopPropagationOrder(true, t)) //add the propagation order to propagate the trade results in next time period
            }
        })
        tp.aa_armies[playerArmyIndex].ta_troops = SortTroops(tp.aa_armies[playerArmyIndex].ta_troops)
        troopsGiven.ta_troops = []
    } else { //if they don't have an army here
        //This should never happen as an empty army is created when the trade window is filled in if none is found
    }

    DrawBoard()
}

//----------------------------------------------
//-------------MAIN GAME LOGIC------------------
//----------------------------------------------

let pa_players: Player[] = [] //stores the list of players in the game

for (let i: number = 0; i < 5; i++) {  //TEMP:
    const testPlayer: Player = new Player(i, `Test Player ${i+1}`)
    pa_players.push(testPlayer)
}

let currentTurnIndex: number //stores which player is currently up
let currentPlayerIndex: number = 0 //TEMP: not sure how this will work when this game goes to multiplayer

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
    
    CleanArmies() //makes sure that any empty armies are removed

    //handles the time period board
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

    //handles the drawing of the selected time periods info board
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
        if (pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].ba_buildings.length > 0) { //checks if there are any buildings in the time period
            pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].ba_buildings.forEach((b) => buildingBox.innerHTML += `${b.s_name}`) //if so: loops through them all and writes them to the box
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
        if (pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_ownerIndex === currentTurnIndex) { //hides the controls if the player does not own the time period
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
                    //TODO:
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

    //handles the drawing of the players board
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

    //handles the drawing of the current player info board
    if (pa_players[currentPlayerIndex].na_location[0] === -1) { //checks if the player has not yet gone to a time period
        locationSpot.innerHTML = `Location: Nowhere` //if so: show them as nowhere
    } else {
        locationSpot.innerHTML = `Location: ${pa_planets[pa_players[currentPlayerIndex].na_location[0]].s_name} Age ${pa_players[currentPlayerIndex].na_location[1] + 1}` //if not: write which planet and time period they are in
    }
    resourceSpot.innerHTML = `Resources: ${pa_players[currentPlayerIndex].n_resources}` //fills in the line showing the player's resources
    if (pa_players[currentPlayerIndex].a_troops.ta_troops.length > 0) { //checks if the player has any troops onboard
        troopListSpot.innerHTML = `${TroopsString(pa_players[currentPlayerIndex].a_troops, false)}` //writes the player's TroopString to the box
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

const AdvanceTurn = (): void => { //ends the current turn and starts the next one

    pa_players[currentTurnIndex].EndTurn() //removes any unused action from the player ending their turn

    if (currentTurnIndex === (pa_players.length - 1)) { //advances the player whose turn it is by on, making sure to loop around once at the end
        pa_players.forEach((p) => p.HealTroops()) //heals the troops on the ships of all players
        let pIndex = 0;
        pa_planets.forEach((p) => {
            p.DoResourceGen(pIndex) //run resource gen for each planet
            p.ProgressBuildQueues(pIndex) //runs the build queues for all the planets
            p.DoCombat(pIndex) //runs combat for all the planets
            p.DoIntegration() //runs integration for all the planets
            p.DoPropagation(pIndex) //runs propagation for all planets
            pIndex++ //increments the pIndex so the next planet has the correct index
        })
        //pa_players = shufflePlayers(pa_players) //randomize the order of the players
        currentTurnIndex = 0 //loops around at the end of a full turn cycle
    } else {
        currentTurnIndex++ //moves the turn to the next player
    }

    pa_players[currentTurnIndex].StartTurn() //sets the current player up so they have their actions

    currentPlayerIndex = currentTurnIndex //TEMP: makes the UI show whichever player is the current turn: game is currently pass and play

    DrawBoard()
}

const InitializeGame = (): void => { //used to set up the game

    //pa_players = shufflePlayers(pa_players) //randomize the order of the players
    currentTurnIndex = 0
    pa_players[currentTurnIndex].StartTurn()

    //initializes some style for the page
    document.body.style.backgroundColor = gameBackgroundColor //sets the background of the site to the gameBackgroundColor
    timePeriodBoard.style.backgroundColor = boardBackgroundColor
    selectedTimePeriodDisplay.style.backgroundColor = boardBackgroundColor //sets the display background color to the same color as the canvas
    playerListDisplay.style.backgroundColor = boardBackgroundColor //sets the background color of the player list board to the board background color
    currentPlayerInfoBox.style.backgroundColor = boardBackgroundColor //sets the background color of the player info box to the board background color

    tradingWindow.style.backgroundColor = boardBackgroundColor //set the background color of the trading window
    //sets up the central position of the trading window
    tradingWindow.style.position = 'fixed'
    tradingWindow.style.left = '5%'
    tradingWindow.style.top = '100px'
    tradingWindow.style.display = 'none' //hides the trading window as it is not in use when the game start

    //makes buttons work
    tradeSubmitButton.addEventListener("click", () => Trade(currentTurnIndex, pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex], n_selectedPlanetIndex, n_selectedTimePeriodIndex)) //makes the trade submit button work
    tradeCancelButton.addEventListener("click", () => CloseTradeWindow(currentTurnIndex, pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex])) //makes  the cancel button work
    travelButton.addEventListener("click", () => { //travel button functionality
        if (pa_players[currentPlayerIndex].b_canMove && n_selectedPlanetIndex > -1 && (n_selectedPlanetIndex !== pa_players[currentPlayerIndex].na_location[0] || n_selectedTimePeriodIndex !== pa_players[currentPlayerIndex].na_location[1])) { //makes sure the player can move this turn, has a time period selected, and are not already there
            pa_players[currentPlayerIndex].b_canMove = false //takes the player's move action
            pa_players[currentPlayerIndex].na_location = [n_selectedPlanetIndex, n_selectedTimePeriodIndex] //moves the player
            DrawBoard() //redraws the board
        }
    })
    tradeButton.addEventListener("click", ()  => { //trade button functionality
        if (pa_players[currentPlayerIndex].b_canTrade && pa_players[currentPlayerIndex].na_location[0] === n_selectedPlanetIndex && pa_players[currentPlayerIndex].na_location[1] === n_selectedTimePeriodIndex) { //makes sure the player can trade this turn and is in the selected time period
            pa_players[currentPlayerIndex].b_canTrade = false //takes the player's trade action
            FillInTradeWindow(currentTurnIndex, pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex]) //starts the trade
        }
    })
    endTurnButton.addEventListener("click", () => AdvanceTurn()) //end turn button functionality, makes the end turn button run the AdvanceTurn() function

    for (let i: number = 0; i < numPlanets; i++) { //creates the list of planets of the number specified in the tunable values
        let darkAgePoint: number = Math.floor((Math.random() * Math.floor(numTimePeriods / 3)) + Math.floor(numTimePeriods / 3))
        pa_planets.push(new Planet(`Planet ${i+1}`, darkAgePoint))
    }
    trainTroopButton.innerHTML += ` - ${trainTroopCost}`
    trainTroopButton.addEventListener("click", () => {
        if (pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_resources >= trainTroopCost) { //makes sure that the time period can afford to train the troop
            pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].StartTroopTraining() //starts training a troop
            pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_resources -= trainTroopCost //charges the train troop cost
            DrawBoard() //redraws the board
        }
    }) //makes the button to train troops work
    scorchedEarthButton.addEventListener("click", () => {
        pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].b_scorchedEarth = !pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].b_scorchedEarth //toggles the scorched earth of the selected time period
        DrawBoard() //redraws the board
    }) //makes the scorched earth button work

    DrawBoard() //draws the board when the page loads
}

InitializeGame() //runs the initialize game function to start the game

//WIP: Ideas / sections that need thought
  //how does the game start, no one has a time periods so do they start with troops and choose which to conquer to start: probably
    //what troops to they start with
    //what troops to time periods start with
  //do time periods start the game with some resources
    //should lower power time periods start with more resources to balance it out: maybe, leaning probably

//TODO: things that still need to be done
//Buildings
  //different types that have different effects
    //buildings with passive bonuses
    //maybe buildings with active affects with cool downs
//WIP: conquered time period controls
  //building buildings
    //building menu should be reference in addition to the things already made when showing a list of options to build or train so that the player can't make duplicates
//Starting conditions:
  //player starting troops
  //player starting resources
  //time period starting troops
  //time period starting resources
//small things:
  //fix troop types in troopString()
    //see TODO in the function
//stretch goals for first version
  //troop experience level