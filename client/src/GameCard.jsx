import basketballImg from './assets/images/basketball-court.svg'
import soccerImg from './assets/images/soccer-pitch.svg'
import volleyballImg from './assets/images/beach-volleyball-court.svg'
import { FaLocationPin } from "react-icons/fa6";
import { FaClock } from "react-icons/fa";
import { IoPerson } from "react-icons/io5";
function GameCard({game}){

    const spotsLeft = game.maxPlayers - game.playerCount
    const gameJoinable = spotsLeft > 0;
    const startsAt =  new Date(game.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })


    const sportImages = {
        'Basketball': basketballImg,
        'Soccer': soccerImg,
        'Beach volleyball': volleyballImg,

    }

    // TODO 1: Reorganize the card into two sibling containers:
    // a left information panel and a right image panel.
    // Move sport + skill, title, location, player count, and join button into the left.
    // Keep the sport-to-image lookup for the right panel.
    // Check: all existing information still appears before changing the CSS.

    // TODO 2 (CSS): Lay out .game-card, .card-information, and the image panel.
    // Full instructions are at the bottom of index.css under "TODO 2".

    // TODO 3: Convert game.startsAt into a Date and format its local start time.
    // Show it next to the location. Include spotsLeft in the join button label,
    // handle "1 spot" versus "spots", and disable the button when the game is full.

    // TODO 4 (CSS): Clip the image panel diagonally and make its image fill it.
    // Full instructions are at the bottom of index.css under "TODO 4".
    // Give the wrapper and img different classes so you can style them separately.

    // TODO 5: Handle sports without an image and add a volleyball-only image class
    // so you can adjust its crop without affecting basketball or soccer.

    return(
        

        <div className = "game-card">
            <div className = 'card-information'>
                <div className = 'card-header'>
                        <h2 className = 'card-game-sport'>{game.sport}</h2>
                        <h3>{game.skill}</h3>
                        <div className= 'card-location-section'>
                            <span className = 'card-label'><FaLocationPin /> {game.locationName} |  5 mi</span>

                        </div>
                        <span className='card-label'><FaClock /> {startsAt}</span>
                </div>
                <div className = 'card-footer'>
                    <h2 className='card-game-title'>{game.title}</h2>
                    <div style = {{display: 'flex', gap: '10px', alignItems: 'center'}}>
                        <button className = {gameJoinable? 'join-button': 'join-button full'}>
                            {gameJoinable? 'JOIN GAME' : 'GAME FULL'}</button>
                        <span className = "card-label" style = {{fontSize: '20px'}}><IoPerson /> {game.playerCount} / {game.maxPlayers}</span>
                    </div>
                </div>
            </div>

            <div className = 'card-media'>
                
                <img className = 'card-image'
                    src = {sportImages[game.sport]}
                    alt = {game.sport}/>
            </div>
        </div>

            
            
            
        
    )
}

export default GameCard
