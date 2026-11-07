function FilterBar({
    sportFilter,
    toggleSport,
    onlyJoinable,
    onToggleJoinable 
}) {
    return(
         <div class="filter-button-container">
      <button

          onClick={() => {
            onToggleJoinable()
            
          }}
          aria-pressed={onlyJoinable}
          className = {onlyJoinable ? "filter-button active" : "filter-button"}
          >
          Only Joinable Games
      </button>

      <button

          onClick={() => {
            toggleSport("Soccer")
        
          }}
          aria-pressed={sportFilter.has("Soccer")}
          className = {sportFilter.has("Soccer") ? "filter-button active" : "filter-button"}
          >
          Soccer
      </button>

      <button

          onClick={() => {
            toggleSport("Basketball")
          
          }}
          aria-pressed={sportFilter.has("Basketball")}
          className = {sportFilter.has("Basketball") ? "filter-button active" : "filter-button"}
          >
          Basketball
      </button>

      <button

          onClick={() => {
            toggleSport("Beach volleyball")
          
          }}
          aria-pressed={sportFilter.has("Beach volleyball")}
          className = {sportFilter.has("Beach volleyball") ? "filter-button active" : "filter-button"}
          >
          Beach volleyball
      </button>
    </div>
    )
}

export default FilterBar