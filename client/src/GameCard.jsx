function GameCard({game}){

    const spotsLeft = game.maxPlayers - game.playerCount

    return(
        <div className = "gameCard">
            <h2>{game.title}</h2>
            <p>{game.sport}</p>
            <p>{game.locationName}</p>
            <span>{game.playerCount} / {game.maxPlayers} joined</span>
            <span> {spotsLeft} spots left! </span>
        </div>
    )
}

export default GameCard