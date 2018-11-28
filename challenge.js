const fetch = require("node-fetch")
var solved = false
var level = 0
var maze = []
let first = true
let totalLevels = 100
let data = null
let count = 0

run()

async function run(){
    let token = await getToken()
    while(level <= totalLevels){
        try {
            await start(token.token, null, 0, 0)
            console.log(`Finshed level ${level}!`)
            solved = false
            first = true
        } catch(err){
            console.log(err)
            return
        }
    }
    console.log("Finished all mazes.")
}

async function getToken(){
    count++
    console.log("T", count)
    return await (await fetch("http://ec2-34-216-8-43.us-west-2.compute.amazonaws.com/session", {
        method: "POST",
        mode: "cors",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({"uid": "104906833"})
    })).json()
}

async function start(token, dir, curX, curY){
    if(first){
        data = await (await fetch(`http://ec2-34-216-8-43.us-west-2.compute.amazonaws.com/game?token=${token}`)).json()
        count++
        console.log("G", count)
        if(data.status === "NONE")
            throw new Error("Bad Token")
        else if(data.status == "FINISHED")
            throw new Error("Mazes already solved")
        first = false
        totalLevels = data.total_levels
        level = data.levels_completed + 1
        for(let i = 0; i < data.maze_size[0]; i++){
            maze[i] = []
            for(let j = 0; j < data.maze_size[1]; j++){
                maze[i][j] = 0 // 0 = available, 1 = filled
            }
        }
        curX = data.current_location[0], curY = data.current_location[1]
    }

    maze[curX][curY] = 1
    //console.log(maze)
    if(!solved && curX > 0 && !maze[curX - 1][curY])
        await move(token, "LEFT", curX - 1, curY)
    if(!solved && curX < data.maze_size[0] - 1 && !maze[curX + 1][curY])
        await move(token, "RIGHT", curX + 1, curY)
    if(!solved && curY > 0 && !maze[curX][curY - 1])
        await move(token, "UP", curX, curY - 1)
    if(!solved && curY < data.maze_size[1] && !maze[curX][curY + 1])
        await move(token, "DOWN", curX, curY + 1)
    
    //backtrack
    if(!solved && maze[curX][curY] == 1){
        let oppDir = null
        // undo a dead end by going in the opposite direction
        if(dir === "LEFT")
            oppDir = "RIGHT"
        else if(dir === "RIGHT")
            oppDir = "LEFT"
        else if(dir === "UP")
            oppDir = "DOWN"
        else if(dir === "DOWN")
            oppDir = "UP"
        if(oppDir){
            let res = await (await fetch(`http://ec2-34-216-8-43.us-west-2.compute.amazonaws.com/game?token=${token}`, {
                method: "POST",
                mode: "cors",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({"action": oppDir})
            })).json()
            count++
            console.log("P", count)
        }
    }
}

async function move(token, dir, curX, curY){
    let res = await (await fetch(`http://ec2-34-216-8-43.us-west-2.compute.amazonaws.com/game?token=${token}`, {
        method: "POST",
        mode: "cors",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({"action": dir})
    })).json()
    count++
    console.log("P", count)
    if(res.result === "SUCCESS"){
        await start(token, dir, curX, curY)
    } else if(res.result === "OUT_OF_BOUNDS"){
        return
    } else if(res.result === "WALL"){
        maze[curX][curY] = 2
    } else if(res.result === "END"){
        level++
        solved = true
        first = true
    } else if(res.result === "EXPIRED"){
        throw new Error("Session expired. Please restart program.")
    }
}