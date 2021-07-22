// Declaration of global state object
let state = {
    currentIndex: 0,
    availability: null,
    reserveButtonActive: false
};
// Declaration of global config object used for display text
const config = {
    SERVER_SCRIPT_URL : "http://localhost/Room_Booking_Web_Server/room_booking.php",
    GET_STATE_INTERVAL: 10000,
    RELOAD_TIME: "3:00:00AM"
};

/**
 * Self-invoking function
 * Generate clock object to update the state to contain the currently displayed time every second
 */
(function () {
    setInterval(function () {
        let day = new Date();
        const weekday = new Array(7);
        weekday[0] = "Sunday";
        weekday[1] = "Monday";
        weekday[2] = "Tuesday";
        weekday[3] = "Wednesday";
        weekday[4] = "Thursday";
        weekday[5] = "Friday";
        weekday[6] = "Saturday";
        const month = new Array(12);
        month[0] = "January";
        month[1] = "February";
        month[2] = "March";
        month[3] = "April";
        month[4] = "May";
        month[5] = "June";
        month[6] = "July";
        month[7] = "August";
        month[8] = "September";
        month[9] = "October";
        month[10] = "November";
        month[11] = "December";
        let hour = day.getHours();
        let amPm = "AM";
        if (hour >= 12) {
            amPm = "PM";
            hour -= 12;
        }
        if (hour === 0) {
            hour = 12;
        }
        let minute = day.getMinutes();
        if (minute < 10) {
            minute = "0" + minute;
        }
        let second = day.getSeconds();
        if (second < 10) {
            second = "0" + second;
        }
        state["time"] = hour
            + ":"
            + minute
            + ":"
            + second
            + " "
            + amPm
            + " "
            + weekday[day.getDay()]
            + ", "
            + month[day.getMonth()]
            + " "
            + day.getDate();
        state["date"] = (day.getMonth() + 1) + "/" + (day.getMonth() + 1) + "/" + day.getFullYear();
        renderTime("timeContainer");
        const clockString = hour + ":" + minute + ":" + second + amPm;
        if(clockString === config['RELOAD_TIME']){
            location.reload();
        }
    }, 1000);
})();


const interactionState = {
    state: false,
    interact: function(){
        this.state = true;
    },
    isInteracting: function(){
        return this.state
    },
    endInteraction: function(){
        this.state = false;
    }
    /**
     * This is normally supposed to have a timeout but they're like "NOOOOO"
     * They'll freaking ask me to put it in anyway, but whatever
     */
}

const slots = [
    {
        time: null,
        availability: null,
        pageLeft: false
    },
    {
        time: null,
        availability: null
    },
    {
        time: null,
        availability: null},
    {
        time: null,
        availability: null
    },
    {
        time: null,
        availability: null
    },
    {
        time: null,
        availability: null
    },
    {
        time: null,
        availability: null
    },
    {
        time: null,
        availability: null,
        pageRight: false
    },
]


/**
 * Override default mouse functions to prevent press-hold right click.
 * @param e
 * context menu's default object which is the mouse event
 */
window.oncontextmenu = function(e){
    //TODO: Uncomment this for production
    //e.preventDefault();
}

/**
 * Anonymous callback from self-invoked time display function
 */
function renderTime(timeContainerElement){
    document.getElementById(timeContainerElement).innerHTML = state['time'];
    //rendering Date as well
}

/**
 * @param element
 * Plain text name of element of modal that is to be rendered
 */
function renderModal(element){

}

/**
 * @param element
 * Plain text name of element of the modal that is to be closed
 */
function closeModal(element){

}

/**
 * @param element
 * Plain text name of the root element of the screen to be rendered
 */
function renderScreen(element){

}

/**
 * @param element
 * Plain text name of the root element of the screen to be closed
 */
function closeScreen(element){

}

/**
 * Right page tap
 * If it's a slot, render the confirmation
 * If not, then move the screen forward
 */
function rightmost(){

}

/**
 * Page Left Action
 */
function leftmost(){

}

/**
 * Trim the availability string for display
 * @param serverDisplayFormat
 * The from/to-display from the server
 * @returns {string}
 * A string that works better for the slot display
 */
function getTimeSlotDisplay(serverDisplayFormat){
    return "";
}

/**
 * Populate the slots
 * Render the results to the screen
 * @param serverReply
 * the JSON response from the server with the state and slot info
 */
function populateSlots(serverReply){
    state['reply'] = serverReply;
    document.getElementById("locationContainer").innerHTML = serverReply["room-display-text"]
    if(serverReply["available"]){
        //Text
        document.getElementById("statusContainer").innerHTML = "Available"
        //Left Color Bar
        document.getElementById("leftColorBar").classList.remove('unavailable');
        document.getElementById("leftColorBar").classList.add('available');
        //Right Ribbon
        document.getElementById("rightRibbon").classList.remove('unavailable');
        document.getElementById("rightRibbon").classList.add('available');
    }else{
        //Text
        document.getElementById("statusContainer").innerHTML = "Unavailable"
        //Left Color Bar
        document.getElementById("leftColorBar").classList.remove('available');
        document.getElementById("leftColorBar").classList.add('unavailable');
        //Left Color Bar
        document.getElementById("rightRibbon").classList.remove('available');
        document.getElementById("rightRibbon").classList.add('unavailable');
    }

}

/**
 * Called when a booking slot is clicked
 * If it is a positive page screen
 */
function select(){

}

/**
 * called to get availability, populate state object, render the screen, adjust CSS accordingly
 */
function getAvailabilty(){

}

/**
 * Makes the call to the server make LibCal booking
 * @param bannerID
 * Patrons 9 digit ID
 * @param startISO
 * ISO string for the beginning time
 * @param endISO
 * ISO string for the end time
 * @param roomID
 * string for the LibCal ID
 */
function bookNow(bannerID, startISO, endISO, roomID){
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
        if(this.readyState === 4){
            //interact();
            if(this.status === 200){
                //bookingModal(this.responseText);
            }else{
                //bookingModal('{"error": "SERVER ERROR"}');
            }
        }
    };
    xhr.open("POST", config.SERVER_SCRIPT_URL, true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.send("id=" + roomID + "&bid=" + bannerID + "&time-start=" + startISO+"&time-end=" + endISO);
}

/**
 * Event listener to process a key. This gets attached after a click on instruction
 * to swipe patron's AppCard.
 * @param e
 * keyboard event
 */
function processKey(e){
    if(/^[0-9]$/i.test(e.key)){
        state["card_number"]+=e.key;
    }
    if(state["card_number"].length === 9){
        //console.log("BID: " + state["card_number"]);
        let startISO = state['startISO'];
        let endISO = state['endISO'];
        let roomID = state['reply']['id'];
        window.removeEventListener("keydown", processKey, true);
        let cardNumber = state["card_number"];
        state["card_number"] = "";
        bookNow(cardNumber, startISO, endISO, roomID);
    }
}

/**
 * Function to get the data from the server and send it to the populate function
 */
function makeAjaxCall(){
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
        if(this.readyState === 4){
            if(this.status !== 200){
                //TODO: Need some kind of handling here - would love to use a popup or cancel
                //TODO: but apparently someone has decided it's not ADA friendly.
                //TODO: It has nothing to do with that
            }else{
                if(!interactionState.isInteracting()){
                    populateSlots(JSON.parse(this.responseText));
                }
            }
        }
    };
    xhr.open("GET", config.SERVER_SCRIPT_URL, true);
    xhr.send()
}

//Start main application and attach event listeners
(()=>{
    let mainLoop = setInterval(function(){

    }, config['GET_STATE_INTERVAL'])
    if(!interactionState.isInteracting()){
        makeAjaxCall();
    }
})()
