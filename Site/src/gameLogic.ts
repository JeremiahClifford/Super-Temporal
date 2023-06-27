//----------------------------------------------
//------------------Classes---------------------
//----------------------------------------------

class Button {

    na_position: number[]
    na_size: number[]
    s_color: string
    s_textColor: string
    s_font: string
    s_text: string
    f_action: Function

    constructor (c_position: number[], c_size: number[], c_color: string, c_textColor: string, c_font: string, c_text: string, c_action: Function) {
        this.na_position = c_position
        this.na_size = c_size
        this.s_color = c_color
        this.s_textColor = c_textColor
        this.s_font = c_font
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
        context.fillText(this.s_text, this.na_position[0] + 10, this.na_position[1] + (this.na_size[1] * 0.75))
    }

    OnClick = () => {
        this.f_action()
    }
}

class Player {

    ta_troops: Troop[]
    n_resources: number

    constructor () {
        this.ta_troops = []
        this.n_resources = 0
    }

    Trade = (p_troopsIn: Troop[], p_resourcesIn: number, p_troopsOut: Troop[], p_resourcesOut: number): void => {
        p_troopsIn.forEach((t) => this.ta_troops.push(t)) //take all the troops that are being added from the players inventory and add them to the time period
        //TODO: remove any troops that are being moved out
        
        this.n_resources += p_resourcesIn //add any resources that are being moved into the time period
        this.n_resources -= p_resourcesOut //subtract any resources that are being moved out
    }
}

class Troop {

}

class Building {

}

class TimePeriod {

    n_level: number
    n_resources: number
    ba_buildings: Building[]
    ta_troops: Troop[]

    constructor (c_level: number) {
        this.n_level = c_level
        this.n_resources = 0
        this.ba_buildings = []
        this.ta_troops = []
    }

    Trade = (p_troopsIn: Troop[], p_resourcesIn: number, p_troopsOut: Troop[], p_resourcesOut: number): void => {
        p_troopsIn.forEach((t) => this.ta_troops.push(t)) //take all the troops that are being added from the players inventory and add them to the time period
        //TODO: remove any troops that are bing moved out
        
        this.n_resources += p_resourcesIn //add any resources that are being moved into the time period
        this.n_resources -= p_resourcesOut //subtract any resources that are being moved out
    }
}

//----------------------------------------------
//-------------MAIN GAME LOGIC------------------
//----------------------------------------------

//gets the canvas and context from the HTML Page to be used to draw the game to the canvas on the page
const canvas: HTMLCanvasElement = document.getElementById("viewport") as HTMLCanvasElement
const context: CanvasRenderingContext2D = canvas.getContext('2d') as CanvasRenderingContext2D

const ba_buttons: Button[] = [] //list to store all of the buttons that need to be drawn to the screen

const b_testButton: Button = new Button([10, 10], [120, 30], "green", "white", "20px Arial", "Test Button", () => console.log(`test button pressed`))
ba_buttons.push(b_testButton)

const CheckForButtonPressed = (e: MouseEvent): void => {
    //finds the position on the canvas where the player clicked
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    //console.log("x: " + x + " y: " + y)

    ba_buttons.forEach((b) => { //loops through every button on screen
        if ((x > b.na_position[0] && x < b.na_position[0] + b.na_size[0]) && (y > b.na_position[1] && y < b.na_position[1] + b.na_size[1])) { //checks if the mouse was within the bounds of the button when it was clicked
            b.OnClick() //if it was, execute the button's onclick function
        }
    })
}
canvas.addEventListener('mousedown', (e) => CheckForButtonPressed(e)) //sets an event listener to check if the player clicked on a button for every time they click on the canvas

const DrawBoard = (): void => {
    
    context.fillStyle = "#03053c" //sets the fill color to a dark blue
    context.fillRect(0, 0, canvas.width, canvas.height) //draws a dark blue square over the whole canvas

    ba_buttons.forEach((b) => b.Draw()) //draws all of the buttons to the screen
}

DrawBoard() //draws the board when the page loads