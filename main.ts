namespace SpriteKind {
    export const teammate = SpriteKind.create()
}
namespace userconfig {
    export const ARCADE_SCREEN_WIDTH = 272
    export const ARCADE_SCREEN_HEIGHT = 400
}
tiles.setCurrentTilemap(tilemap`level1`)
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
tiles.placeOnTile(myplayer, tiles.getTileLocation(8, 12))
let mySprite = sprites.create(assets.image`p2`, SpriteKind.teammate)
tiles.placeOnTile(mySprite, tiles.getTileLocation(6, 10))
