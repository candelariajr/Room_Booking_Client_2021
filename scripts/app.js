// Declaration of global state object
let state = {
    anySlotAvailable: false,
    startup: false,
    currentIndex: 0,
    availability: null,
    reserveButtonActive: false,
    selectedSlots: []
};

// Declaration of global config object used for display text
const config = {
    SERVER_SCRIPT_URL : "http://localhost/Room_Booking_Web_Server/room_booking.php",
    GET_STATE_INTERVAL: 10000,
    RELOAD_TIME: "3:00:00AM",
    //Note: Only one screen can be rendered at one time
    SCREENS: [
        "appContainer", "instructionScreen"
    ],
    //Note: Only 1 screen and 1 modal can be rendered at once
    MODALS: [
        "confirmationModal", "resultModal", "errorModal"
    ],
    //They tell me not to do this, but I KNOW that we'll need it. Keeping it. Just making it lest noticeable
    //before changing it during implementation.
    //One Hour
    //INTERACTION_TIMEOUT: 3600000
    // 5 minutes
    INTERACTION_TIMEOUT: 300000,
    FIRST_INSTRUCTION_TEXT: "Tap a Slot to Start",
    UNABLE_TO_LOAD_DATA: "No Data Available",
    TAP_RESERVE: "Tap 'Reserve' to Continue"
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
        state["date"] = (day.getMonth() + 1) + "/" + day.getDate() + "/" + day.getFullYear();
        renderTime("timeContainer");
        const clockString = hour + ":" + minute + ":" + second + amPm;
        if(clockString === config['RELOAD_TIME']){
            location.reload(true);  //TODO: Update this
        }
    }, 1000);
})();

/**
 * Interaction model.
 * @type {{endInteraction: interactionState.endInteraction, interact: interactionState.interact, state: boolean, isInteracting: (function(): boolean), timeout: null}}
 */
const interactionState = {
    state: false,
    interact: function(){
        this.state = true;
        clearTimeout(this.timeout);
        this.timeout = null;
        this.timeout = setTimeout(function(){
            interactionState.endInteraction();
        }, config.INTERACTION_TIMEOUT)
    },
    isInteracting: function(){
        return this.state
    },
    endInteraction: function(){
        clearTimeout(this.timeout);
        this.timeout = null;
        this.state = false;
        state.reserveButtonActive = false;
        if(bottomButtons[state.selectedSlot]['selected']){
            bottomButtons[state.selectedSlot]['selected'] = false;
        }
        state.selectedSlot = null;
        renderSlots();
    },
    timeout: null
}

/**
 * Model of the bottom row of buttons. This governs their actions on click
 * @type {[{pageLeft: boolean, ISOBeginTime: null, ISOEndTime: null, time: null, availability: null, selected: boolean}, {ISOBeginTime: null, ISOEndTime: null, time: null, availability: null, selected: boolean}, {ISOBeginTime: null, ISOEndTime: null, time: null, availability: null, selected: boolean}, {ISOBeginTime: null, ISOEndTime: null, time: null, availability: null, selected: boolean}, {ISOBeginTime: null, ISOEndTime: null, time: null, availability: null, selected: boolean}, null, null, null]}
 * @time: display time
 * @ISOBeginTime: ISO format of start of booking slot
 * @ISOEndTIme: ISO format of end time of booking slot (ISO times are needed by the API).
 */
let bottomButtons = []
for(let i = 0; i < 8; i++){
    bottomButtons.push({
        time: null,
        endTime : null,
        ISOBeginTime : null,
        ISOEndTime: null,
        availability: null,
        pageRight: false,
        selected: false}
    );
}
/*
* -------------------------------------------------------------------------------------------
* END STARTUP SEQUENCE
* -------------------------------------------------------------------------------------------
* */


/**
 * Pull the display times for the slots to be displayed at the bottom row and assign them to
 * bottomButton objects.
 * This is called when data is received from the server.
 * NOTE: This is the new getEight function
 */
function getDisplayTimesToButtonObject(){
    if(!state['reply']){
        error(config.UNABLE_TO_LOAD_DATA);
        return;
    }
    //There are at least 8 slots here
    if(state['reply']['days'][0]['time-slots'].length >= 8){
        for(let i = 0; i < 8; i++) {
            setSlotData(0, i, i)
        }
    }else{
        //pick up the last slots of the current day and the ones from the next day for a total of 8
        let firstDaySlotCount = state['reply']['days'][0]['time-slots'].length;
        let secondDaySlotCount = 8 - firstDaySlotCount;
        let  buttonSlotPosition = 0;
        //TODO: Audit this as there is probably an off by 1 error in here somewhere.
        for(let i = 0; i < firstDaySlotCount; i++){
            setSlotData(0, i, i);
            buttonSlotPosition++;
        }
        for(let i = 0; i < secondDaySlotCount; i++){
            setSlotData(1, i, buttonSlotPosition)
            buttonSlotPosition++;
        }
    }
    //add a blurb to display next available time
    let nextAvailTime = null;
    for(let i = 0; i < bottomButtons.length; i++){
        if(!nextAvailTime){
            if(bottomButtons[i].availability === 'available'){
                nextAvailTime = bottomButtons[i].time;
            }
        }
    }
    if(nextAvailTime){
        document.getElementById("statusContainer").innerHTML = ("Unavailable: Opens at " + nextAvailTime);
    }
    renderSlots();
}

/**
 * Support function for getDisplayTimesToButtonObject()
 * Called by loops to tell which server data goes into the global slots properties.
 * @param serverDataDay
 * The given day within the server data object (it gets today and tomorrow for late night
 * transition between days)
 * @param serverSlotIndex
 * Index of the server day to put into the given slot index
 * @param slotArrayIndex
 * The slot index the server data goes into
 */
function setSlotData(serverDataDay, serverSlotIndex, slotArrayIndex){
    let slot = state['reply']['days'][serverDataDay]['time-slots'][serverSlotIndex];
    //Remove AM/PM at end
    let startTime = slot['from-display'].split(" ")[0];
    let endTime = slot['to-display'].split(" ")[0];
    //Remove leading zeroes
    if(startTime.charAt(0) === '0'){
        startTime = startTime.substring(1, startTime.length)
    }
    if(endTime.charAt(0) === '0'){
        endTime = endTime.substring(1, endTime.length)
    }
    bottomButtons[slotArrayIndex]['time'] = startTime
    bottomButtons[slotArrayIndex]['endTime'] = endTime;
    bottomButtons[slotArrayIndex]['ISOBeginTime'] = slot['from-iso'];
    bottomButtons[slotArrayIndex]['ISOEndTime'] = slot['to-iso'];
    bottomButtons[slotArrayIndex]['availability'] = slot['status'];
}


/**
 * Render the slots based on the contents of the bottomButton objects.
 */
function renderSlots(){
    // cleanup function called
    // cleanup();
    state.anySlotAvailable = false;
    for(let i= 0; i < 8; i++) {
        let element = document.getElementById("s" + i);
        if (bottomButtons[i]['availability'] &&
            //Redundant, but error checking kept flagging this one
            typeof bottomButtons[i]['availability'] === 'string' &&
            bottomButtons[i]['availability'].toString() === 'available') {
            state.anySlotAvailable = true;
            element.innerHTML = bottomButtons[i]['time'];
            element.className = "bookingSlot available";
        } else {
            element.innerHTML = bottomButtons[i]['time'];
            element.className = "bookingSlot unavailable";
        }
        if (bottomButtons[i]['selected']) {
            state.anySlotAvailable = true;
            element.className = "bookingSlot selected";
        }
    }
    //TODO: Clean up some of this logic
    if(state.anySlotAvailable === false){
        //No Slots Available
        document.getElementById("firstInstruction").innerHTML = "";
    }else if(state['reply']['days']['null'] === false){
        //if server didn't send null for dates array
        document.getElementById("firstInstruction").innerHTML = config.FIRST_INSTRUCTION_TEXT;
    }else{
        //if server did send null for dates array
    }
    if(state.reserveButtonActive === true){
        //if reserve button is active (meaning user has clicked on something that can be booked)
        document.getElementById("reserveButton").className = "reserve-active";
        document.getElementById("firstInstruction").innerHTML = config.TAP_RESERVE;
    }else{
        //reset the text if user cancels
        document.getElementById("reserveButton").className="reserve-inactive";
        if(state.anySlotAvailable !== false){
            document.getElementById("firstInstruction").innerHTML = config.FIRST_INSTRUCTION_TEXT;
        }
    }
}

/**
 * Support function for renderSlots and possibly others in the future
 * This resets all modals, resets all state parameters, and clears up any remaining old data from the screen
 */
function cleanup(){
    //clean up modals
    let modalContents = document.getElementsByName("modal-content");
    for(let i = 0; i < modalContents.length; i++){
        modalContents[i].innerHTML = "";
    }
    //clean up state parameters
    state = {
        anySlotAvailable: false,
        // startup: false,
        currentIndex: 0,
        availability: null,
        reserveButtonActive: false,
        selectedSlots: []
    };
    //clean up slots
    for(let i = 0; i < bottomButtons.length; i++){
        bottomButtons[i] = {
            time: null,
            endTime : null,
            ISOBeginTime : null,
            ISOEndTime: null,
            availability: null,
            pageRight: false,
            selected: false
        }
    }
}


/**
 * Event that takes an argument based on event listener assignment
 * This is called whenever any of the bottom buttons is pressed
 * @param i
 */
function bottomButton(i){
    interactionState.interact();
    //if slot is available
    if(bottomButtons[i]['availability'] === 'available'){
        //if nothing else is selected
        if(!state.reserveButtonActive){
            bottomButtons[i]['selected'] = true;
            state.selectedSlots[0] = i;
            state.reserveButtonActive = true;
            //if slot is already selected
        }else if(i === state.selectedSlots[0]){
            bottomButtons[i]['selected'] = false;
            state.selectedSlots[0] = null;
            state.reserveButtonActive = false;
            //if different slot is selected
        }else{
            bottomButtons[state.selectedSlots[0]]['selected'] = false;
            bottomButtons[i]['selected'] = true;
            state.selectedSlots[0] = i;
        }
    }
    renderSlots();
}

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
    document.getElementById("currentDateContainer").innerHTML = state['date'];
}

/**
 * Renders Error modal to screen with message
 * @param message
 */
function error(message){
    //TODO: Implement Modal
    renderModal("errorModal");
    document.getElementById("errorMiddle").innerHTML = message;
    console.log(message);
}

/**
 * @param element
 * Plain text name of element of modal that is to be rendered
 * A Model rendering is just displaying it to the screen. Different Modals have
 * different functions so a template doesn't work.
 */
function renderModal(element){
    for(let i = 0; i < config.MODALS.length; i++){
        if(element === config.MODALS[i]){
            document.getElementById(config.MODALS[i]).style.display = "block";
        }else{
            document.getElementById(config.MODALS[i]).style.display = "none";
        }
    }
    for(let i = 0; i < config.SCREENS.length; i++){
        //make all screens opaque
        document.getElementById(config.SCREENS[i]).className = "screen opaque";
    }
}

/**
 * Close modal: Close all modals and remove opacity filter
 */
function closeModal(){
    for(let i = 0; i < config.MODALS.length; i++){
        document.getElementById(config.MODALS[i]).style.display = "none";
    }
    for(let i = 0; i < config.SCREENS.length; i++){
        //make all screens clear (but NOT displayed)
        document.getElementById(config.SCREENS[i]).className = "screen";
    }
}

/**
 * @param element
 * Plain text name of the root element of the screen to be rendered
 */
function renderScreen(element){
    closeModal();

}

/**
 * @param element
 * Plain text name of the root element of the screen to be closed
 */
function closeScreen(element){

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
 * Added listener for reserve button
 * If something is selected and this button is active, render confirmation window
 */
function makeReservation(){
    // Note: Selected Slots is an array for in case we implement selecting multiple slots at once.
    if(state.reserveButtonActive){
        console.log(bottomButtons[state.selectedSlots[0]]);

        document.getElementById("confirmationMiddle").innerHTML =
            "You are reserving this room from " + bottomButtons[state.selectedSlots[0]]['time']  + " to " +
            bottomButtons[state.selectedSlots[0]]['endTime'] +".";
        renderModal("confirmationModal");
    }
}

/**
 * Populate the slots
 * Render the results to the screen
 * @param serverReply
 * the JSON response from the server with the state and slot info
 */
function populateSlots(serverReply){
    //snap Server reply to Global State
    state['reply'] = serverReply;
    //render the big display colors (Color Bar and Ribbon)
    //render the text (avail, room number)
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
    getDisplayTimesToButtonObject();
}

/**
 * Called when a booking slot is clicked
 * If it is a positive page screen
 */
function select(){

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
    console.log(state.startup)
    if(state.startup === false){
        document.getElementById("locationContainer").innerHTML = "Getting New Data...";
        state.startup = true;
    }
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
        if(this.readyState === 4){
            if(this.status !== 200){
                //TODO: Need some kind of handling here - would love to use a popup or cancel
                //TODO: but apparently someone has decided it's not ADA friendly.
                //TODO: It has nothing to do with that
            }else{
                if(!interactionState.isInteracting()){
                    let JSONReply = JSON.parse(this.responseText);
                    if(JSONReply['error']){
                        error(JSONReply['error']);
                    }else {
                        cleanup();
                        populateSlots(JSONReply);
                    }
                }
            }
        }
    };
    xhr.open("GET", config.SERVER_SCRIPT_URL, true);
    xhr.send()
}

//Start main application and attach event listeners
(()=>{
    // declare main loop that's always running
    let mainLoop = setInterval(function(){
        if(!interactionState.isInteracting()){
            makeAjaxCall();
        }
    }, config['GET_STATE_INTERVAL']);
    //add event listeners to bottom row of buttons
    for(let i = 0; i < 8; i++){
        document.getElementById("s" + i).addEventListener('click', function(){
            interactionState.interact();
            bottomButton(i);
        });
    }
    //add listeners to other buttons
    document.getElementById("reserveButton").addEventListener('click', function(){
        interactionState.interact();
        makeReservation();
    });
    //TEST
    document.getElementById("cancelConfirmationButton").addEventListener('click', function(){
        closeModal();
    });
    //ERROR CLOSE
    document.getElementById("errorClose").addEventListener('click', function(){
        closeModal();
    });
})()
