namespace SpriteKind {
    export const teammate = SpriteKind.create()
    export const Ball = SpriteKind.create()
    export const Marker = SpriteKind.create()
}
namespace userconfig {
    export const ARCADE_SCREEN_WIDTH = 272
    export const ARCADE_SCREEN_HEIGHT = 400
}

// ------------------------------------------------------------
// 2 v 2 FOOTBALL
// Your team (red + orange) attacks the TOP goal.
// The blue team attacks the BOTTOM goal.
//
// Arrows : move the player with the yellow arrow above them
// A      : pass to your teammate (if you have the ball)
//          switch player (if you don't have the ball)
// B      : shoot at the top goal
// If a blue player touches the player with the ball, they take it!
// ------------------------------------------------------------

// ---------- Field measurements (pixels) ----------
// The goal mouth is the gap between the posts (tile columns 5 to 10)
const GOAL_LEFT = 80
const GOAL_RIGHT = 176
const TOP_GOAL_LINE = 30
const BOTTOM_GOAL_LINE = 370
const FIELD_CENTER_X = 136

// ---------- Speeds ----------
const PLAYER_SPEED = 75
const AI_CHASE_SPEED = 52
const AI_SUPPORT_SPEED = 42
const SHOT_SPEED = 165
const BALL_FRICTION = 60

tiles.setCurrentTilemap(tilemap`level1`)

// Make the goal posts solid so the ball can hit the post and bounce
tiles.setWallAt(tiles.getTileLocation(4, 0), true)
tiles.setWallAt(tiles.getTileLocation(4, 1), true)
tiles.setWallAt(tiles.getTileLocation(11, 0), true)
tiles.setWallAt(tiles.getTileLocation(11, 1), true)
tiles.setWallAt(tiles.getTileLocation(4, 24), true)
tiles.setWallAt(tiles.getTileLocation(4, 23), true)
tiles.setWallAt(tiles.getTileLocation(11, 24), true)
tiles.setWallAt(tiles.getTileLocation(11, 23), true)

// ---------- My team ----------
let myplayer = sprites.create(img`
    . . . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . . . .
    . . . . . 2 2 2 2 2 2 2 . . . . .
    . . . . 2 2 2 2 2 2 2 2 2 . . . .
    . . . 2 2 2 2 2 2 2 2 2 2 2 . . .
    . . 2 2 2 2 2 2 2 2 2 2 2 2 2 . .
    . . 2 2 2 2 f f f f f 2 2 2 2 . .
    . . f 2 2 2 f f f f f 2 2 2 f . .
    . . f 2 2 2 f f f f f 2 2 2 f . .
    . . f 2 2 2 f f f f f 2 2 2 f . .
    . . 2 2 2 2 2 f f f 2 2 2 2 2 . .
    . . 2 2 2 2 2 2 2 2 2 2 2 2 2 . .
    . . . 2 2 2 2 2 2 2 2 2 2 2 . . .
    . . . . 2 2 2 2 2 2 2 2 2 . . . .
    . . . . . 2 2 2 2 2 2 2 . . . . .
    . . . . . . . . . . . . . . . . .
    . . . . . . . . . . . . . . . . .
    `, SpriteKind.Player)
let myteammate = sprites.create(assets.image`p2`, SpriteKind.teammate)

// ---------- Other team (same shape, coloured blue) ----------
let blueImage = assets.image`p2`.clone()
blueImage.replace(4, 8)
let enemy1 = sprites.create(blueImage, SpriteKind.Enemy)
let enemy2 = sprites.create(blueImage.clone(), SpriteKind.Enemy)

let myTeam: Sprite[] = [myplayer, myteammate]
let otherTeam: Sprite[] = [enemy1, enemy2]
let everyone: Sprite[] = [myplayer, myteammate, enemy1, enemy2]
for (let p of everyone) {
    p.setStayInScreen(true)
    sprites.setDataNumber(p, "noTouchUntil", 0)
}

// ---------- Ball ----------
let ball = sprites.create(img`
    . f f f .
    f 1 1 1 f
    f 1 f 1 f
    f 1 1 1 f
    . f f f .
    `, SpriteKind.Ball)
ball.setBounceOnWall(true)
ball.setStayInScreen(true)
ball.fx = BALL_FRICTION
ball.fy = BALL_FRICTION
ball.z = 5

// ---------- Arrow showing which player you control ----------
let marker = sprites.create(img`
    5 5 5 5 5
    . 5 5 5 .
    . . 5 . .
    `, SpriteKind.Marker)
marker.setFlag(SpriteFlag.Ghost, true)
marker.z = 10

// ---------- Game state ----------
let controlled: Sprite = myplayer   // the player YOU move
let owner: Sprite = null            // who has the ball (null = loose ball)
let stealUntil = 0                  // short pause after a tackle
let paused = false                  // true while showing "GOAL!"

info.setScore(0)
info.player2.setScore(0)

// ============================================================
// Helper functions
// ============================================================

function isMyTeam(s: Sprite): boolean {
    return s == myplayer || s == myteammate
}

function distance(a: Sprite, b: Sprite): number {
    return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y))
}

// Set a sprite's velocity so it runs toward (x, y)
function runTo(s: Sprite, x: number, y: number, speed: number) {
    let dx = x - s.x
    let dy = y - s.y
    let d = Math.sqrt(dx * dx + dy * dy)
    if (d < 4) {
        s.vx = 0
        s.vy = 0
    } else {
        s.vx = dx / d * speed
        s.vy = dy / d * speed
    }
}

// Kick the loose ball toward (x, y) with a speed
function kickBall(kicker: Sprite, x: number, y: number, speed: number) {
    let dx = x - ball.x
    let dy = y - ball.y
    let d = Math.sqrt(dx * dx + dy * dy)
    if (d < 1) {
        d = 1
    }
    owner = null
    ball.vx = dx / d * speed
    ball.vy = dy / d * speed
    // the kicker can't touch the ball again straight away
    sprites.setDataNumber(kicker, "noTouchUntil", game.runtime() + 350)
}

// Pass to a partner: the ball is kicked just hard enough to reach them
function pass(from: Sprite, to: Sprite) {
    let d = distance(ball, to)
    let speed = Math.sqrt(2 * BALL_FRICTION * d) + 25
    kickBall(from, to.x, to.y, speed)
    music.footstep.play()
}

// Shoot at a goal. The further away you are, the less accurate the shot,
// and from very far away the ball slows down before it reaches the goal.
function shoot(shooter: Sprite, goalY: number) {
    let dx = FIELD_CENTER_X - shooter.x
    let dy = goalY - shooter.y
    let d = Math.sqrt(dx * dx + dy * dy)
    let spread = d * 0.45
    let aimX = FIELD_CENTER_X + (Math.random() * 2 - 1) * spread
    kickBall(shooter, aimX, goalY, SHOT_SPEED)
    music.knock.play()
}

function giveBallTo(s: Sprite) {
    owner = s
    ball.vx = 0
    ball.vy = 0
    if (isMyTeam(s)) {
        controlled = s   // you always control the player with the ball
    }
}

// Put everyone back in position. kickoffMine = true means your team starts with the ball
function kickoff(kickoffMine: boolean) {
    tiles.placeOnTile(myplayer, tiles.getTileLocation(8, 13))
    tiles.placeOnTile(myteammate, tiles.getTileLocation(5, 17))
    tiles.placeOnTile(enemy1, tiles.getTileLocation(8, 10))
    tiles.placeOnTile(enemy2, tiles.getTileLocation(11, 7))
    for (let p of everyone) {
        p.vx = 0
        p.vy = 0
    }
    controlled = myplayer
    stealUntil = game.runtime() + 1000
    if (kickoffMine) {
        giveBallTo(myplayer)
    } else {
        giveBallTo(enemy1)
    }
}

function goalScored(mine: boolean) {
    paused = true
    owner = null
    ball.vx = 0
    ball.vy = 0
    if (mine) {
        info.changeScoreBy(1)
        music.powerUp.play()
    } else {
        info.player2.changeScoreBy(1)
        music.wawawawaa.play()
    }
    control.runInParallel(function () {
        if (mine) {
            game.splash("GOAL!", "You scored!")
        } else {
            game.splash("GOAL...", "Blue team scored")
        }
        // the team that let the goal in gets the kickoff
        kickoff(!mine)
        paused = false
    })
}

// ============================================================
// Buttons
// ============================================================

controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
    if (paused) {
        return
    }
    let partner = myplayer
    if (controlled == myplayer) {
        partner = myteammate
    }
    if (owner == controlled) {
        pass(controlled, partner)
        controlled = partner   // control follows the pass
    } else {
        controlled = partner   // switch player when you don't have the ball
    }
})

controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
    if (paused) {
        return
    }
    if (owner == controlled) {
        shoot(controlled, 0)
    }
})

// ============================================================
// Every frame
// ============================================================

game.onUpdate(function () {
    if (paused) {
        for (let p of everyone) {
            p.vx = 0
            p.vy = 0
        }
        return
    }
    let now = game.runtime()

    // ----- 1. Move the player you control -----
    let speed = PLAYER_SPEED
    if (owner == controlled) {
        speed = PLAYER_SPEED - 10   // a bit slower while dribbling
    }
    controlled.vx = 0
    controlled.vy = 0
    if (controller.left.isPressed()) {
        controlled.vx = 0 - speed
    }
    if (controller.right.isPressed()) {
        controlled.vx = speed
    }
    if (controller.up.isPressed()) {
        controlled.vy = 0 - speed
    }
    if (controller.down.isPressed()) {
        controlled.vy = speed
    }

    // ----- 2. Your other player (computer controlled) -----
    let helper = myplayer
    if (controlled == myplayer) {
        helper = myteammate
    }
    if (owner != null && isMyTeam(owner)) {
        // get open up the field for a pass
        let supportX = owner.x + 70
        if (owner.x > FIELD_CENTER_X) {
            supportX = owner.x - 70
        }
        runTo(helper, supportX, Math.max(60, owner.y - 60), AI_SUPPORT_SPEED)
    } else {
        // drop back between the ball and our goal
        runTo(helper, (ball.x + FIELD_CENTER_X) / 2, Math.min(340, ball.y + 50), AI_SUPPORT_SPEED)
    }

    // ----- 3. The blue team -----
    if (owner != null && !isMyTeam(owner)) {
        let carrier = owner
        let mate = enemy1
        if (carrier == enemy1) {
            mate = enemy2
        }
        // dribble toward the bottom goal
        runTo(carrier, FIELD_CENTER_X, BOTTOM_GOAL_LINE + 20, AI_CHASE_SPEED - 8)
        // supporting player
        let mateX = carrier.x - 60
        if (carrier.x < FIELD_CENTER_X) {
            mateX = carrier.x + 60
        }
        runTo(mate, mateX, Math.min(340, carrier.y + 40), AI_SUPPORT_SPEED)

        // pass if one of your players is close, shoot if near your goal
        let underPressure = distance(carrier, myplayer) < 30 || distance(carrier, myteammate) < 30
        if (carrier.y > 285) {
            shoot(carrier, 400)
        } else if (underPressure && Math.percentChance(3)) {
            pass(carrier, mate)
        }
    } else {
        // chase the ball with whoever is closest, the other one defends
        let chaser = enemy1
        let defender = enemy2
        if (distance(enemy2, ball) < distance(enemy1, ball)) {
            chaser = enemy2
            defender = enemy1
        }
        runTo(chaser, ball.x, ball.y, AI_CHASE_SPEED)
        runTo(defender, (ball.x + FIELD_CENTER_X) / 2, Math.max(60, (ball.y + TOP_GOAL_LINE) / 2), AI_SUPPORT_SPEED)
    }

    // ----- 4. The ball -----
    if (owner != null) {
        // the ball stays at the feet of whoever has it
        ball.x = owner.x
        if (isMyTeam(owner)) {
            ball.y = owner.y - 9    // my team runs up the screen
        } else {
            ball.y = owner.y + 9    // blue team runs down the screen
        }
        // tackle! a player from the other team touching the ball carrier takes the ball
        if (now > stealUntil) {
            for (let p of everyone) {
                if (isMyTeam(p) != isMyTeam(owner) && p.overlapsWith(owner)) {
                    giveBallTo(p)
                    stealUntil = now + 800
                    music.thump.play()
                    break
                }
            }
        }
    } else {
        // loose ball: the first player to touch it gets it
        for (let p of everyone) {
            if (now > sprites.readDataNumber(p, "noTouchUntil") && p.overlapsWith(ball)) {
                giveBallTo(p)
                break
            }
        }
    }

    // ----- 5. Did the ball go in a goal? -----
    if (ball.x > GOAL_LEFT && ball.x < GOAL_RIGHT) {
        if (ball.y < TOP_GOAL_LINE) {
            goalScored(true)
        } else if (ball.y > BOTTOM_GOAL_LINE) {
            goalScored(false)
        }
    }

    // ----- 6. Arrow above the player you control -----
    marker.x = controlled.x
    marker.bottom = controlled.top - 1
})

// ============================================================
// Match timer
// ============================================================

info.onCountdownEnd(function () {
    if (info.score() > info.player2.score()) {
        game.over(true)
    } else {
        game.over(false)
    }
})

kickoff(true)
info.startCountdown(120)
