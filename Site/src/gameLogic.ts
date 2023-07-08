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

const timePeriodBoardShift: number = 40

const planetLabelHeight: number = 30 //how tall the planet's name should be at the top of the display
const planetOverviewWidth: number = 75 //how wide the column that shows a particular planet should be drawn
const timePeriodOverviewHeight: number = 70 //how tall the box that shows the time period overview should be

const planetLabelFont: string = "15px Arial" //what size and font should the planet name labels be
const boardNumberLabelWidth: number = 30 //how wide should the time period number labels be

//----------------------------------------------
//--------------Helper Functions----------------
//----------------------------------------------

const SortTroops = (ta: Troop[]): Troop[] => { //sorts the troops of an army in descending order of power
    return ta.sort((a, b) => { //uses the built in sort method
        return (b.n_level + b.n_modifier) - (a.n_level + a.n_modifier)
    })
}

const TroopsString = (a: Army): string => { //gives a string representation of the player's or time period's list of troops
    a.ta_troops = SortTroops(a.ta_troops) //sorts the troops so they are in a good order to be printed

    //squashes troops of the same level into 1 line
    //arrays to store the types of power level and how many of them there are
    let troopTypes: number[] = [] //types of level
    let typeCounts: number[] = [] //number of each type

    for (let i: number = 0; i < a.ta_troops.length; i++) { //loops through the array and checks if this is the first of the power level
        if (troopTypes.indexOf(a.ta_troops[i].n_level + a.ta_troops[i].n_modifier) > -1) { //if not: increments the count for that power level
            for (let j: number = 0; j < troopTypes.length; j++) {
                if (troopTypes[j] === a.ta_troops[i].n_level + a.ta_troops[i].n_modifier) {
                    typeCounts[j]++
                }
            }
        } else {
            troopTypes.push(a.ta_troops[i].n_level + a.ta_troops[i].n_modifier) //if so: adds that level to the bottom on the list and gives it a count of 1
            typeCounts.push(1)
        }
    }

    let output: string = ``
    if (a.n_ownerIndex === -1) {
        output = `Natives:<br>${a.ta_troops.length} Troop(s):<br>` //adds the header to the output showing how many total troops the army has and the owner
    } else {
        output = `${pa_players[a.n_ownerIndex].s_name}:<br>${a.ta_troops.length} Troop(s):<br>` //adds the header to the output showing how many total troops the army has and the owner
    }
    for (let i: number = 0; i < troopTypes.length; i++) { //loops through the types
        output += `${typeCounts[i]}x Level: ${troopTypes[i]}<br>` //adds a line of their info to the output string
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
        selectButton.id = `${a.n_ownerIndex}-swap-button-${i}`
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
                    pa_planets[i].ta_timePeriods[j].aa_armies = pa_planets[i].ta_timePeriods[j].aa_armies.filter((a) => a.ta_troops.length !== 0) //if so: removes it WIP: not how splice() works, see SwapTroops() for reference
                }
            }
        }
    }
}

const DebugPlanets = (): void => { //function to print the info of all the planets to the console for debugging
    pa_planets.forEach((p) => {
        console.log(`${p.s_name}: `)
        console.log(` Time Periods:`)
        for (let i: number = 0; i < p.ta_timePeriods.length; i++) {
            console.log(`  Age ${i+1}:`)
            console.log(`   Raw Level: ${p.ta_timePeriods[i].n_rawLevel}`)
            console.log(`   Level: ${p.ta_timePeriods[i].n_level}`)
            console.log(`   Raw Modifier: ${p.ta_timePeriods[i].n_rawModifierFactor}`)
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

class Button {

    na_position: number[]
    na_size: number[]
    s_color: string
    s_textColor: string
    s_font: string
    na_textOffset: number[]
    s_text: string
    f_action: Function

    constructor (c_position: number[], c_size: number[], c_color: string, c_textColor: string, c_font: string, c_textOffset: number[], c_text: string, c_action: Function) {
        this.na_position = c_position
        this.na_size = c_size
        this.s_color = c_color
        this.s_textColor = c_textColor
        this.s_font = c_font
        this.na_textOffset = c_textOffset
        this.s_text = c_text
        this.f_action = c_action
    }

    Draw = (): void => {
        //draws the button
        context.fillStyle = this.s_color
        context.fillRect(this.na_position[0], this.na_position[1], this.na_size[0], this.na_size[1])
        //draws the text on the button
        context.fillStyle = this.s_textColor
        context.font = this.s_font
        context.fillText(this.s_text, this.na_position[0] + this.na_textOffset[0], this.na_position[1] + this.na_textOffset[1])
    }

    OnClick = () => {
        this.f_action()
    }
}

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

    constructor (c_level: number, c_modifier: number) {
        this.n_rawLevel = c_level
        this.n_level = Math.pow(2, this.n_rawLevel)
        this.n_modifier = c_modifier
    }

    ProgressIntegration = (currentTimePeriodLevel: number): void => {
        if (currentTimePeriodLevel > this.n_rawLevel) {
            this.n_rawLevel++
            this.n_level = Math.pow(2, this.n_rawLevel)
        }
    }

    ToString = () => {
        return `Level: ${this.n_level + this.n_modifier}`
    }
}

class Army {

    n_ownerIndex: number
    ta_troops: Troop[]

    constructor (c_ownerIndex: number, c_troops: Troop[]) {
        this.n_ownerIndex = c_ownerIndex
        this.ta_troops = c_troops
    }
}

class Building {

    s_name: string

    constructor (c_name: string) {
        this.s_name = c_name
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
    ba_buildings: Building[]
    aa_armies: Army[]

    constructor (c_level: number, c_modifierFactor: number) {
        this.n_ownerIndex = -1
        this.n_rawLevel = c_level
        this.n_level = Math.pow(2, this.n_rawLevel)
        this.n_rawModifierFactor = c_modifierFactor
        this.n_powerModifier = c_modifierFactor * this.n_level
        if (this.n_powerModifier < 1) { //truncates the troop power modifier to 2 decimals if less than zero or whole number if more than zero to keep things tidy
            this.n_powerModifier = Math.round(this.n_powerModifier * 100) *0.01
        } else {
            this.n_powerModifier = Math.round(this.n_powerModifier)
        }
        this.n_resourceProduction = baseResourceProduction * (1 + ((maxModifierFactor - c_modifierFactor) * resourceRateAdjuster)) //sets the resource production bonus to the inverse of the troop power bonus to balance time periods that have good troops with lower resource production
        this.n_resourceProduction = Math.round(this.n_resourceProduction * 100) *0.01 //truncates the resource modifier to 2 decimals
        this.n_resources = this.n_resourceProduction * 5 //TEMP: starts the time period with 5 turns worth of resources. not sure what I want this to be in the final version
        this.ba_buildings = []
        this.aa_armies = [new Army(-1, [new Troop(this.n_rawLevel, this.n_powerModifier * 1.25)])] //TEMP: not sure what troops time periods will start with if any
    }

    Draw = (p_widthOffset: number, p_heightOffset: number, p_planetsIndex: number, p_timePeriodIndex: number): void => {
        context.fillStyle = boardBackgroundColor //sets the fill color to the background color
        context.fillRect(p_widthOffset, p_heightOffset, planetOverviewWidth, timePeriodOverviewHeight) //draws a white square over the area where the planet is to be drawn
        context.strokeStyle = boardOutlineColor //sets the stroke color to the outline
        context.lineWidth = 3 //sets the width of the stroke line
        if (p_planetsIndex === n_selectedPlanetIndex && p_timePeriodIndex === n_selectedTimePeriodIndex) { //checks if the current time period is the one that the player has selected
            context.strokeStyle = "red" //sets the stroke color to a red
            context.lineWidth = 4 //sets the width of the stroke line
        }
        context.strokeRect(p_widthOffset, p_heightOffset, planetOverviewWidth, timePeriodOverviewHeight) //draws a black square around the area where the planet is to be drawn
    }
}

class Planet {

    s_name: string
    ta_timePeriods: TimePeriod[]

    constructor (c_name: string) {

        this.s_name = c_name

        //generate the time periods
        this.ta_timePeriods = []
        for (let i: number = 0; i < numTimePeriods; i++) { //creates the specified number of time periods for the planets
            this.ta_timePeriods.push(new TimePeriod(i, Math.random() * maxModifierFactor)) //creates all of the planets, providing the power level and the random modifier
        }
    }

    Draw = (p_widthOffset: number, p_planetIndex: number): void => {
        //draws a label of the planets name at the top
        context.fillStyle = boardBackgroundColor //sets the fill color to the background color
        context.fillRect(p_widthOffset + timePeriodBoardShift, timePeriodBoardShift - planetLabelHeight, planetOverviewWidth, planetLabelHeight)
        context.strokeStyle = boardOutlineColor //sets the stroke color to the outline color
        context.lineWidth = 3 //sets the width of the stroke line
        context.strokeRect(p_widthOffset + timePeriodBoardShift, timePeriodBoardShift - planetLabelHeight, planetOverviewWidth, planetLabelHeight) //draws the background for the planet's name
        context.font = planetLabelFont //makes sure that the planet label font is set properly
        context.fillStyle = "black" //sets the fill color to a black
        context.fillText(`${this.s_name}`, timePeriodBoardShift + 2 + (p_planetIndex * planetOverviewWidth), timePeriodBoardShift - 10)

        for (let i: number = 0; i < this.ta_timePeriods.length; i++) { //lops through all of the time periods of this planet and runs their draw function
            this.ta_timePeriods[i].Draw(p_widthOffset + timePeriodBoardShift, (timePeriodOverviewHeight * i) + timePeriodBoardShift, p_planetIndex, i) //draws a border around the label of the planet's name
        }
    }
}

//----------------------------------------------
//-----------------Trading----------------------
//----------------------------------------------

//holds onto the trading window
const tradingWindow: HTMLElement = document.getElementById('trading-window') as HTMLElement //the whole trading window
const timePeriodPresent: HTMLElement = document.getElementById('time-period-present') as HTMLElement //the box where the things in the time period go
const timePeriodForTrade: HTMLElement = document.getElementById('time-period-for-trade') as HTMLElement //box of the things that are coming from the time period
const playerPresent: HTMLElement = document.getElementById('player-present') as HTMLElement //the box where the things the player has go
const playerForTrade: HTMLElement = document.getElementById('player-for-trade') as HTMLElement //box of things the player is giving in the trade
const tradeCancelButton: HTMLButtonElement = document.getElementById('trade-window-cancel-button') as HTMLButtonElement //cancel button

let resourcesGiven: number = 0
let resourcesTaken: number = 0
let troopsGiven: Army = new Army(-2, [])
let troopsTaken: Army = new Army(-3, [])

const FillInTradeWindow = (p: number, t: TimePeriod): void => { //function which writes everything that is in the trade. This function runs every time something is changed in the trade tto update the UI

    tradingWindow.style.display = "block" //shows the trade window

    //fills in the time periods side
    //fills in the time period present
    timePeriodPresent.innerHTML = `
        <div class="resource-trade-card">
            <h4>Resources: ${t.n_resources}</h4>
        <div>
    ` //resets the text and adds a card for the resources in the time period
    let playerArmyIndex: number = -1 //the index at which the player's army in the time period is. -1 by default as they might not have an army
    for (let i: number = 0; i < t.aa_armies.length; i++) { //finds which army in the time period belongs to the player if any
        if (t.aa_armies[i].n_ownerIndex === p) {
            playerArmyIndex = i
        }
    }
    if (playerArmyIndex > -1) { //checks if the player has an army in the time period
        timePeriodPresent.innerHTML += TroopCardList(t.aa_armies[playerArmyIndex], false, troopsTaken)//if so: writes out the troops of that army
        for (let i = 0; i < t.aa_armies[playerArmyIndex].ta_troops.length; i++) { //gives the events to the buttons
            let selectButton: HTMLButtonElement = document.getElementById(`${playerArmyIndex}-swap-button-${i}`) as HTMLButtonElement
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
    timePeriodForTrade.innerHTML = `
        <div class="resource-trade-card">
            <h4>Resources: ${resourcesTaken}</h4>
        <div>
    ` //resets the text and adds a card for the resources in the time period
    timePeriodForTrade.innerHTML += TroopCardList(troopsTaken, true, t.aa_armies[playerArmyIndex])
    for (let i: number = 0; i < troopsTaken.ta_troops.length; i++) { //gives the events to the buttons
        let selectButton: HTMLButtonElement = document.getElementById(`${troopsTaken.n_ownerIndex}-swap-button-${i}`) as HTMLButtonElement
        selectButton.addEventListener('click', () => {
            SwapTroop(troopsTaken, i, t.aa_armies[playerArmyIndex])
        })
    }

    //fills in the player side
    //fills in the player present
    playerPresent.innerHTML = `
        <div class="resource-trade-card">
            <h4>Resources: ${pa_players[p].n_resources}</h4>
        <div>
    ` //resets the text and adds a card for the resources that the player has onboard
    playerPresent.innerHTML += TroopCardList(pa_players[p].a_troops, false, troopsGiven)
    for (let i = 0; i < pa_players[p].a_troops.ta_troops.length; i++) { //gives the events to the buttons
        let selectButton: HTMLButtonElement = document.getElementById(`${p}-swap-button-${i}`) as HTMLButtonElement
        selectButton.addEventListener('click', () => {
            SwapTroop(pa_players[p].a_troops, i, troopsGiven)
        })
    }
    //fills in the player selected
    playerForTrade.innerHTML = `
        <div class="resource-trade-card">
            <h4>Resources: ${resourcesGiven}</h4>
        <div>
    ` //resets the text and adds a card for the resources in the time period
    playerForTrade.innerHTML += TroopCardList(troopsGiven, true, pa_players[p].a_troops)
    for (let i: number = 0; i < troopsGiven.ta_troops.length; i++) { //gives the events to the buttons
        let selectButton: HTMLButtonElement = document.getElementById(`${troopsGiven.n_ownerIndex}-swap-button-${i}`) as HTMLButtonElement
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
tradeCancelButton.addEventListener("click", () => CloseTradeWindow(currentTurnIndex, pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex])) //makes  the cancel button work

const SwapTroop = (start: Army, startIndex: number, target: Army): void => { //WIP: not quite working properly
    target.ta_troops.push(start.ta_troops[startIndex]) //adds the troops to the target
    target.ta_troops = SortTroops(target.ta_troops) //sorts the target
    start.ta_troops =  start.ta_troops.filter((t) => t !== start.ta_troops[startIndex]) //removes the troop from where it started
    FillInTradeWindow(currentTurnIndex, pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex]) //redraws the trade window
}

const Trade = (p: number, t: TimePeriod, p_troopsGiven: Troop[], p_troopsTaken: Troop[], p_resourcesTaken: number, p_resourcesGiven: number): void => { //function to move troops and resources between a player's ship and a time period given and taken are form the player's perspective. P is the index in pa_players of the player doing the trading
    let playerArmyIndex: number = -1
    for (let i: number = 0; i < t.aa_armies.length; i++) { //finds if the player already has an army in this time period
        if (t.aa_armies[i].n_ownerIndex === p) {
            playerArmyIndex = i
        }
    }
    if (playerArmyIndex > -1) { //if they have an army here
        //TODO: implement functionality
    } else { //if they don't have an army here
        //TODO: implement functionality
    }
    //TODO: this should be just the opposite of cancel; move the given to the time period and taken to the player
}

//----------------------------------------------
//-------------MAIN GAME LOGIC------------------
//----------------------------------------------

const pa_players: Player[] = [] //stores the list of players in the game

for (let i: number = 0; i < 10; i++) {  //TEMP:
    const testPlayer: Player = new Player(i, `Test Player ${i+1}`)
    pa_players.push(testPlayer)
}

let currentTurnIndex: number //stores which player is currently up
let currentPlayerIndex: number = 0 //TEMP: not sure how this will work when this game goes to multiplayer

const pa_planets: Planet[] = [] //stores the list of the planets in play

//holds onto the display for the selected timer period and its parts
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
//TODO: add a box to the selected time period display that shows which players if any are there
    //do so by looping through the player list and checking if they are at the selected time period
    //make it a scrolling box

const playerListDisplay: HTMLElement = document.getElementById('player-list-display') as HTMLElement //the section which has the list of players
const playerListBox: HTMLElement = document.getElementById('player-list-box') as HTMLElement//the scrolling box that will show the list of players

//holds onto the display for the player's info
const currentPlayerInfoBox: HTMLElement = document.getElementById('player-info') as HTMLElement //the box that has the player's info
const locationSpot: HTMLElement = document.getElementById('location-spot') as HTMLElement //the line for the players location
const resourceSpot: HTMLElement = document.getElementById('resource-spot') as HTMLElement //the line for the player's resources
const troopListSpot: HTMLElement = document.getElementById('troop-list-spot') as HTMLElement //the scrolling box that shows what troops the player has

//stores the coordinates of the selected time period
let n_selectedPlanetIndex: number = -1
let n_selectedTimePeriodIndex: number = -1

//gets the canvas and context from the HTML Page to be used to draw the game to the canvas on the page
const canvas: HTMLCanvasElement = document.getElementById("viewport") as HTMLCanvasElement
const context: CanvasRenderingContext2D = canvas.getContext('2d') as CanvasRenderingContext2D

const ba_buttons: Button[] = [] //list to store all of the buttons that need to be drawn to the screen

const b_moveButton: Button = new Button([10, 750], [123, 30], "green", "white", "20px Arial", [10, 22], "Travel Here", () => {
    if (pa_players[currentTurnIndex].b_canMove) { //makes sure the player still has their move action available
        if (n_selectedPlanetIndex !== -1) { //makes sure that a time period is selected
            pa_players[currentPlayerIndex].na_location = [n_selectedPlanetIndex, n_selectedTimePeriodIndex] //moves the current player to the selected time period
            pa_players[currentTurnIndex].b_canMove = false //takes the player's move action
        }
    }
})

const b_tradeButton: Button = new Button([165, 750], [120, 30], "green", "white", "20px Arial", [10, 22], "Trade Here", () => {
    if (pa_players[currentTurnIndex].b_canTrade) { //makes sure the player still has their trade action available
        if (n_selectedPlanetIndex !== -1) { //makes sure that a time period is selected
            FillInTradeWindow(currentTurnIndex, pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex])
            pa_players[currentTurnIndex].b_canTrade = false //takes the player's trade action
        }
    }
})

const b_endTurnButton: Button = new Button([313, 750], [100, 30], "green", "white", "20px Arial", [10, 22], "End Turn", () => AdvanceTurn())
ba_buttons.push(b_endTurnButton)

const CheckForPressed = (e: MouseEvent): void => {
    //finds the position on the canvas where the player clicked
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ba_buttons.forEach((b) => { //loops through every button on screen
        if ((x > b.na_position[0] && x < b.na_position[0] + b.na_size[0]) && (y > b.na_position[1] && y < b.na_position[1] + b.na_size[1])) { //checks if the mouse was within the bounds of the button when it was clicked
            b.OnClick() //if it was, execute the button's onclick function
        }
    })
    //checks the contextual buttons
    //move button
    if ((x > b_moveButton.na_position[0] && x < b_moveButton.na_position[0] + b_moveButton.na_size[0]) && (y > b_moveButton.na_position[1] && y < b_moveButton.na_position[1] + b_moveButton.na_size[1])) { //checks if the mouse was within the bounds of the button when it was clicked
        b_moveButton.OnClick() //if it was, execute the button's onclick function
    }
    //trade button
    if ((x > b_tradeButton.na_position[0] && x < b_tradeButton.na_position[0] + b_tradeButton.na_size[0]) && (y > b_tradeButton.na_position[1] && y < b_tradeButton.na_position[1] + b_tradeButton.na_size[1])) { //checks if the mouse was within the bounds of the button when it was clicked
        b_tradeButton.OnClick() //if it was, execute the button's onclick function
    }

    for (let i: number = 0; i < pa_planets.length; i++) { //checks all of the planet displays
        for (let j: number = 0; j < pa_planets[0].ta_timePeriods.length; j++) { //checks all of the time period displays inm the planet
            if ((x > (i * planetOverviewWidth) + timePeriodBoardShift && x < ((i + 1) * planetOverviewWidth) + timePeriodBoardShift) && (y > (j * timePeriodOverviewHeight) + timePeriodBoardShift && y < ((j + 1) * timePeriodOverviewHeight) + timePeriodBoardShift)) { //checks if the click was within the display of that time period
                if (n_selectedPlanetIndex === i && n_selectedTimePeriodIndex === j) { //checks if the clicked on time period is already selected
                    //sets the selected indexes to the default none values if it is currently selected
                    n_selectedPlanetIndex = -1
                    n_selectedTimePeriodIndex = -1
                } else {
                    //sets the selected indexes to that time period
                    n_selectedPlanetIndex = i
                    n_selectedTimePeriodIndex = j
                }
            }
        }
    }

    DrawBoard()
}
canvas.addEventListener('mousedown', (e) => CheckForPressed(e)) //sets an event listener to check if the player clicked on a button for every time they click on the canvas

const DrawBoard = (): void => {
    
    CleanArmies() //makes sure that any empty armies are removed

    context.fillStyle = gameBackgroundColor //sets the fill color to the game background color
    context.fillRect(0, 0, canvas.width, canvas.height) //draws a dark blue square over the whole canvas

    ba_buttons.forEach((b) => b.Draw()) //draws all of the buttons to the screen
    //handles the buttons which are only shown if the corresponding action is available to the current player
    if (pa_players[currentTurnIndex].b_canMove) { //if the player can move: draw the move button
        b_moveButton.Draw()
    }
    if (pa_players[currentTurnIndex].b_canTrade) { //if the player can trade: draw the trade button
        b_tradeButton.Draw()
    }

    for (let i: number = 0; i < numTimePeriods; i++) { //loops through all of the time period levels and draws a number on the side of the board
        context.fillStyle = boardBackgroundColor //sets the fill color to the background color
        context.fillRect(timePeriodBoardShift - boardNumberLabelWidth, timePeriodBoardShift  + (timePeriodOverviewHeight * i), boardNumberLabelWidth, timePeriodOverviewHeight) //draws a white background where the number will go
        context.strokeStyle = boardOutlineColor //sets the stroke color to the outline color
        context.lineWidth = 3 //sets the width of the stroke line
        context.strokeRect(timePeriodBoardShift - boardNumberLabelWidth, timePeriodBoardShift  + (timePeriodOverviewHeight * i), boardNumberLabelWidth, timePeriodOverviewHeight) //draws a black border around where the number will go
        context.font = planetLabelFont //makes sure that the planet label font is set properly
        context.fillStyle = "black" //sets the fill color to a black
        context.fillText(`${i+1}`, timePeriodBoardShift - (boardNumberLabelWidth * 0.8), timePeriodBoardShift  + ((timePeriodOverviewHeight * (i + 1)) - (timePeriodOverviewHeight * 0.4)))
    }

    for (let i: number = 0; i < pa_planets.length; i++) { //loops through all of the planets
        pa_planets[i].Draw(planetOverviewWidth * i, i) //runs their draw function
    }

    //handles the drawing of the selected time periods info board
    if (n_selectedPlanetIndex != -1) {
        planetLine.innerHTML = `${pa_planets[n_selectedPlanetIndex].s_name}` //writes which planet is selected
        ageLine.innerHTML = `Age ${n_selectedTimePeriodIndex}` //writes which time period is selected
        //writes the relevant info from the time period
        if (pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_ownerIndex === -1) { //checks if the time period is owner by a player
            ownerLine.innerHTML = `Owner: ${pa_planets[n_selectedPlanetIndex].s_name} natives` //if not: writes that it is owned by people from that planet
        } else {
            ownerLine.innerHTML = `Owner: Player ${pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].n_ownerIndex + 1}` //if so: writes the owner of the time period
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
                troopBox.innerHTML += TroopsString(pa_planets[n_selectedPlanetIndex].ta_timePeriods[n_selectedTimePeriodIndex].aa_armies[i])
            }
        } else {
            troopBox.innerHTML = `None` //if not: writes none to the list
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
    }

    //handles the drawing of the players board
    //TODO: add the stuff that the player has to their card
    playerListBox.innerHTML = ``
    pa_players.forEach((p) => {
        if (p.na_location[0] === -1) {
            playerListBox.innerHTML += `
                <div class="player-card">
                    <h3>${p.s_name}</h3>
                    <h4>Location: Nowhere</h4>
                </div>
            `
        } else {
            playerListBox.innerHTML += `
                <div class="player-card">
                    <h3>${p.s_name}</h3>
                    <h4>Location: ${pa_planets[p.na_location[0]].s_name} Age ${p.na_location[1] + 1}</h4>
                </div>
            `
        }
    })

    //handles the drawing of the current player info board
    if (pa_players[currentPlayerIndex].na_location[0] === -1) { //checks if the player has not yet gone to a time period
        locationSpot.innerHTML = `Location: Nowhere` //if so: show them as nowhere
    } else {
        locationSpot.innerHTML = `Location: ${pa_planets[pa_players[currentPlayerIndex].na_location[0]].s_name} Age ${pa_players[currentPlayerIndex].na_location[1] + 1}` //if not: write which planet and time period they are in
    }
    resourceSpot.innerHTML = `Resources: ${pa_players[currentPlayerIndex].n_resources}` //fills in the line showing the player's resources
    if (pa_players[currentPlayerIndex].a_troops.ta_troops.length > 0) { //checks if the player has any troops onboard
        troopListSpot.innerHTML = `${TroopsString(pa_players[currentPlayerIndex].a_troops)}` //writes the player's TroopString to the box
    } else {
        troopListSpot.innerHTML = `None`//if not: writes none
    }
}

const AdvanceTurn = (): void => { //ends the current turn and starts the next one

    pa_players[currentTurnIndex].EndTurn() //removes any unused action from the player ending their turn

    if (currentTurnIndex === (pa_players.length - 1)) { //advances the player whose turn it is by on, making sure to loop around once at the end
        //TODO: here is where resource gen, troop training, building, combat, integration, propagation, etc should go
        currentTurnIndex = 0 //loops around at the end of a full turn cycle
    } else {
        currentTurnIndex++ //moves the turn to the next player
    }

    pa_players[currentTurnIndex].StartTurn() //sets the current player up so they have their actions

    currentPlayerIndex = currentTurnIndex //TEMP: makes the UI show whichever player is the current turn: game is currently pass and play

    DrawBoard()
}

const InitializeGame = (): void => { //used to set up the game

    //TODO: randomize order of players
    currentTurnIndex = 0
    pa_players[currentTurnIndex].StartTurn()

    //initializes some style for the page
    document.body.style.backgroundColor = gameBackgroundColor //sets the background of the site to the gameBackgroundColor
    selectedTimePeriodDisplay.style.backgroundColor = boardBackgroundColor //sets the display background color to the same color as the canvas
    playerListDisplay.style.backgroundColor = boardBackgroundColor //sets the background color of the player list board to the board background color
    currentPlayerInfoBox.style.backgroundColor = boardBackgroundColor //sets the background color of the player info box to the board background color

    tradingWindow.style.backgroundColor = boardBackgroundColor //set the background color of the trading window
    //sets up the central position of the trading window
    tradingWindow.style.position = 'fixed'
    tradingWindow.style.left = '5%'
    tradingWindow.style.top = '100px'
    tradingWindow.style.display = 'none' //hides the trading window as it is not in use when the game start

    for (let i: number = 0; i < numPlanets; i++) { //creates the list of planets of the number specified in the tunable values
        pa_planets.push(new Planet(`Planet ${i+1}`))
    }

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
//rework the time period board to not use the canvas
  //use HTML Elements
    //this should make the board scale better
    //no need to make my own buttons and click handling
//trading troops and resources between your ship and time periods
  //WIP: selecting things to move
    //selecting an amount of resources
  //functionality of trade() function to move the selected things back and forth
//combat
  //conquering time periods
  //troop experience level
//conquered time period controls
  //building buildings
  //training troops
//integration
//propagation
//player board additional information
//randomize player order at game start
//players here section of the selected time period board