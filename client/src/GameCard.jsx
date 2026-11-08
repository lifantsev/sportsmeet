import basketballImg from './assets/images/basketball-court.svg'
import soccerImg from './assets/images/soccer-pitch.svg'
import volleyballImg from './assets/images/beach-volleyball-court.svg'
function GameCard({game}){

    const spotsLeft = game.maxPlayers - game.playerCount

    const sportImages = {
        'Basketball': basketballImg,
        'Soccer': soccerImg,
        'Beach volleyball': volleyballImg,

    }

    return(
        <div className = "gameCard">
            <div className = 'card-header'>
                <span className = 'card-location'>{game.locationName}</span>
                <span className = "card-player-count">{game.playerCount} / {game.maxPlayers} joined</span>
            </div>

            <img className = 'card-image'
            src = {sportImages[game.sport]}
            alt = {game.sport}/>

            
            <div className = 'card-footer'>
                <h2 className='card-game-title'>{game.title}</h2>
                <p className = 'card-game-sport'>{game.sport}</p>
                <button className = 'join-button'>JOIN GAME</button>
            </div>

            
            
            
        </div>
    )
}

export default GameCard
