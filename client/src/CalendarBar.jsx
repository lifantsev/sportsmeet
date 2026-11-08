function CalendarBar ({dateFilter, toggleDateFilter, dates}){
    return (
        <div className = 'calendar-bar'>
          {dates.map((date) => (
            <button 
            key={date.toDateString()} 
            className= {dateFilter === date.toDateString()? "calendar-button active": "calendar-button"}
            onClick={() => toggleDateFilter(date)}>
                <span>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span>
                    {date.getDate()}
                </span>
            </button>
          ))}
            
        </div>
    )
}

export default CalendarBar