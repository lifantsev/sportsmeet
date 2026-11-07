function GameCard({game}){

    const spotsLeft = game.maxPlayers - game.playerCount

    return(
        <div className = "gameCard">
            <div className = 'card-header'>
                <span className = 'card-location'>{game.locationName}</span>
                <span className = "card-player-count">{game.playerCount} / {game.maxPlayers} joined</span>
            </div>
            
            
            <div className = 'card-footer'>
                <h2>{game.title}</h2>
                <p>{game.sport}</p>
                
            </div>
            
            
            
        </div>
    )
}

export default GameCard