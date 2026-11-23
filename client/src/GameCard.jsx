import basketballImg from './assets/images/basketball-court.svg'
import soccerImg from './assets/images/soccer-pitch.svg'
import volleyballImg from './assets/images/beach-volleyball-court.svg'
import { FaLocationPin } from 'react-icons/fa6'
import { FaClock, FaRunning } from 'react-icons/fa'
import { IoPerson } from 'react-icons/io5'

const sportImages = {
  basketball: basketballImg,
  soccer: soccerImg,
  'beach volleyball': volleyballImg,
}

function GameCard({ game }) {
  const hasCapacity = Number.isFinite(game.maxPlayers) && Number.isFinite(game.playerCount)
  const gameJoinable = hasCapacity && game.playerCount < game.maxPlayers
  const startsAt = new Date(game.time ?? game.startsAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
  const location = game.place ?? game.locationName
  const image = sportImages[game.sport.trim().toLowerCase()]

  return (
    <div className="game-card">
      <div className="card-information">
        <div className="card-header">
          <h2 className="card-game-sport">{game.sport}</h2>
          {game.title && <h2 className="card-game-title">{game.title}</h2>}
          <div className="card-more-info">
            <span className="card-label time-label"><FaClock aria-hidden="true" /><span>{startsAt}</span></span>
          </div>
        </div>
        <div className="card-footer">
          <div className="card-location-section">
            <span className="card-label"><FaLocationPin aria-hidden="true" /><span>{location}</span></span>
            {game.skill && (
              <>
                <span className="card-label-separator" aria-hidden="true">|</span>
                <span className="card-label"><FaRunning aria-hidden="true" /><span>{game.skill}</span></span>
              </>
            )}
          </div>
          {hasCapacity && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button type="button" className={gameJoinable ? 'join-button' : 'join-button full'} disabled={!gameJoinable}>
                {gameJoinable ? 'JOIN GAME' : 'GAME FULL'}
              </button>
              <span className="card-label" style={{ fontSize: '20px' }}>
                <IoPerson aria-hidden="true" /><span>{game.playerCount} / {game.maxPlayers}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {image && (
        <div className="card-media">
          <img className="card-image" src={image} alt="" />
        </div>
      )}
    </div>
  )
}

export default GameCard
