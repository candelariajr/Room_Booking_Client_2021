// Declaration of global state object
let state = {
    anySlotAvailable: false,
    activeModal: false,
    startup: false,
    currentIndex: 0,
    availability: null,
    reserveButtonActive: false,
    selectedSlots: [],
    cardNumber: ""
};


// Global variables mainly used for development purposes - not a part of general config or to be adjusted
// in installation
const globals = {
    // Note: Only one screen can be rendered at one time
    SCREENS: [
        "appContainer", "instructionScreen"
    ],
    // Note: Only 1 screen and 1 modal can be rendered at once
    MODALS: [
        "confirmationModal", "resultModal", "errorModal"
    ],
    // SLOT_COUNT: 8, // to be removed when Zoop is added in the future
    ZOOP: true,
    DISABLE_TIMEOUT: false // used only for development and testing
};

/**
 * Self-invoking function
 * Generate clock object to update the state to contain the currently displayed time every second
 * Runs non-stop and reloads the site at configured reload time (default 3am)
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
            + getMonth(day.getMonth())
            + " "
            + day.getDate();
        state["date"] = (day.getMonth() + 1) + "/" + day.getDate() + "/" + day.getFullYear();
        renderTime("timeContainer");
        const clockString = hour + ":" + minute + ":" + second + amPm;
        if(clockString === config['RELOAD_TIME']){
            // TODO: Update this
            // noinspection JSDeprecatedSymbols
            location.reload(true);
        }
    }, 1000);
})();

/**
 * Support function for timing object and getDisplayTimesToButtonObject function
 * @param monthIndex
 */
function getMonth(monthIndex){
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
    return month[monthIndex];
}



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
        if(!globals.DISABLE_TIMEOUT){
            // manage interaction state
            clearTimeout(this.timeout);
            this.timeout = null;
            this.state = false;
            // remove keydown listener
            window.removeEventListener("keydown", processKey, true);
            // in case of handshaking and local I/O being out of sync
            state['cardNumber'] = "" ;
            // soft cleanup
            clearSelection();
            renderSlots();
            // render main screen
            renderScreen("appContainer");
        }
    },
    interactTime: function(time){
        this.state = true;
        clearTimeout(this.timeout);
        this.timeout = null;
        this.timeout = setTimeout(function(){
            console.log("Timed out for " + time);
            interactionState.endInteraction();
        }, time)
    },
    timeout: null
}

/**
 * Model of the bottom row of buttons. This governs their actions on click
 * @type {[{slots: *[], "day-label": string},{slots: *[], "day-label": string}]}
 * @time: display time
 * @ISOBeginTime: ISO format of start of booking slot
 * @ISOEndTIme: ISO format of end time of booking slot (ISO times are needed by the API).
 */
let bottomButtons = getBlankButtons();


function getBlankButtons(){
    return [{
            'day-label': '',
            slots: []
        },
        {
            'day-label': '',
            slots: []
        }
    ];
}

/*
for(let i = 0; i < globals.SLOT_COUNT; i++){
    bottomButtons.push({
        time: null,
        endTime : null,
        ISOBeginTime : null,
        ISOEndTime: null,
        availability: null,
        selected: false,
        display: false}
    );
}
*/
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
        error(config.UNABLE_TO_LOAD_DATA, 1);
        return;
    }
    /*
    // There are at least 8 slots here
    if(state['reply']['days'][0]['time-slots'].length >= bottomButtons.length){
        for(let i = 0; i < bottomButtons.length; i++) {
            setSlotData(0, i, i)
        }
    }else{
        // pick up the last slots of the current day and the ones from the next day for a total of 8
        let firstDaySlotCount = state['reply']['days'][0]['time-slots'].length;
        // let secondDaySlotCount = bottomButtons.length - firstDaySlotCount;
        let buttonSlotPosition = 0;
        //TODO: Audit this as there is probably an off by 1 error in here somewhere.
        for(let i = 0; i < firstDaySlotCount; i++){
            setSlotData(0, i, i);
            buttonSlotPosition++;
        }
        //for(let i = 0; i < secondDaySlotCount; i++){
        //     setSlotData(1, i, buttonSlotPosition)
        //    buttonSlotPosition++;
        //}
    }
    // add a blurb to display next available time
    // TODO: This is unorganized
    if(!state['reply']['available']){
        let nextAvailTime = null;
        for(let i = 0; i < bottomButtons.length; i++){
            if(!nextAvailTime){
                if(bottomButtons[i]['availability'] === 'available'){
                    nextAvailTime = bottomButtons[i].time;
                }
            }
        }
        if(nextAvailTime){
            let templatePartials = config.NEXT_AVAILABLE.split("#");
            document.getElementById("statusContainer").innerHTML = (templatePartials[0] +
                " " +
                nextAvailTime +
                templatePartials[1]);
        }
    }
    // If app is frozen for dev/testing, this makes a fake booking slot available
    if(globals.DISABLE_TIMEOUT){
        bottomButtons[2]['availability'] = 'available';
    }
    */
    console.log(state['reply']);
    bottomButtons = getBlankButtons();
    for(let days = 0; days < state['reply']['days'].length; days++){
        let day = {
            "month" : state['reply']['days'][days]['month'],
            "day" : state['reply']['days'][days]['day'],
            "year" : state['reply']['days'][days]['year']
        }
        bottomButtons[days]['day-label'] = getDayLabel(day);
        for(let slots = 0; slots < 48; slots++){
            let serverReplySlot = {'display' : false};
            if (slots < state['reply']['days'][days]['time-slots'].length){
                serverReplySlot = state['reply']['days'][days]['time-slots'][slots];
                serverReplySlot['display'] = true;
                serverReplySlot['selected'] = false;
            }
            bottomButtons[days]['slots'][slots] = serverReplySlot;
        }
    }
    console.log(bottomButtons);
    renderSlots();
}

/**
 * support function for getDisplayTimesToButtonObject
 * @param day
 * @returns {string}
 */
function getDayLabel(day){
    return day['day'] + ", " + getMonth(parseInt(day['month']) - 1);
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
/*
function setSlotData(serverDataDay, serverSlotIndex, slotArrayIndex){
    let slot = state['reply']['days'][serverDataDay]['time-slots'][serverSlotIndex];
    // Remove AM/PM at end
    let startTime = slot['from-display'].split(" ")[0];
    let endTime = slot['to-display'].split(" ")[0];
    // Remove leading zeroes
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
*/

/**
 * Render the slots based on the contents of the bottomButton objects.
 */
/*
function renderSlots(){
    // cleanup function called
    // cleanup();
    state.anySlotAvailable = false;
    for(let i= 0; i < 8; i++) {
        let element = document.getElementById("s" + i);
        if (bottomButtons[i]['availability'] &&
            // Redundant, but error checking kept flagging this one
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
    // TODO: Clean up some of this logic
    if(state.anySlotAvailable === false){
        // No Slots Available
        document.getElementById("firstInstruction").innerHTML = "";
    }else if(state['reply']['days']['null'] === false){
        // if server didn't send null for dates array
        document.getElementById("firstInstruction").innerHTML = config.FIRST_INSTRUCTION_TEXT;
    }else{
        // if server did send null for dates array
    }
    if(state.reserveButtonActive === true){
        // if reserve button is active (meaning user has clicked on something that can be booked)
        document.getElementById("reserveButton").className = "reserve-active";
        document.getElementById("firstInstruction").innerHTML = config.TAP_RESERVE;
    }else{
        // reset the text if user cancels
        document.getElementById("reserveButton").className="reserve-inactive";
        if(state.anySlotAvailable !== false){
            document.getElementById("firstInstruction").innerHTML = config.FIRST_INSTRUCTION_TEXT;
        }
    }
}*/

/**
 * Re/renders slots to the screen. Called when new changes are made to model or new data is generated
 * Called by:
 *      InteractionState.endInteraction()
 *      getDisplayTimesToButtonObject()
 *      bottomButtons()
 */
function renderSlots(){
    state.reserveButtonActive = state.selectedSlots.length !== 0;
    if(state.reserveButtonActive === true){
        // if reserve button is active (meaning user has clicked on something that can be booked)
        document.getElementById("reserveButton").className = "reserve-active";
        document.getElementById("firstInstruction").innerHTML = config.TAP_RESERVE;
    }else{
        state.reserveButtonActive = false;
        // reset the text if user cancels
        document.getElementById("firstInstruction").innerHTML = config.FIRST_INSTRUCTION_TEXT;
        document.getElementById("reserveButton").className="reserve-inactive";
        if(state.anySlotAvailable !== false) {
            document.getElementById("firstInstruction").innerHTML = config.FIRST_INSTRUCTION_TEXT;
        }
    }
    let nextAvailble = false;
    //document.getElementById("reserveButton").className = "reserve-active";
    for(let i = 0; i < bottomButtons.length; i++){
        if(i === 0){
            document.getElementById("dayOne").innerHTML = bottomButtons[i]['day-label'];
        }
        if(i === 1){
            document.getElementById("dayTwo").innerHTML = bottomButtons[i]['day-label'];
        }
        for(let j = 0; j < bottomButtons[i]['slots'].length; j++){
            let dayPart = (i + 1) + "";
            let slotPart = (j + 1) + "";
            let element = document.getElementById("d" + dayPart + "s" + slotPart);
            // Check if a displayable button
            if(bottomButtons[i]['slots'][j]['display']){
                // write in "from time"
                let fromDisplay = bottomButtons[i]['slots'][j]['from-display'];
                let slot = bottomButtons[i]['slots'][j];
                if(fromDisplay.charAt(0) === "0"){
                    fromDisplay = fromDisplay.substring(1, fromDisplay.length);
                }
                element.innerHTML = fromDisplay;
                if(slot['status'] === 'unavailable') {
                    element.className = "bookingSlot unavailable";
                }else if(slot['status'] === 'available') {
                    if(!nextAvailble && state.reply['available'] === false){
                        nextAvailble = slot['from-display'];
                        document.getElementById("statusContainer").innerHTML =
                            ("This room isn't available until " + nextAvailble + ".");
                    }
                    element.className = 'bookingSlot available';
                }
                if(slot['selected'] === true){
                    element.className = 'bookingSlot selected';
                }
                // make visible
                element.style.display = "inline-block";
            }else{
                // make invisible
                element.style.display = "none";
            }
        }
    }
}

/**
 * Support function for renderSlots and possibly others in the future
 * This resets all modals, resets all state parameters, and clears up any remaining old data from the screen
 */
function cleanup(){
    // clean up modals
    let modalContents = document.getElementsByName("modal-content");
    for(let i = 0; i < modalContents.length; i++){
        modalContents[i].innerHTML = "";
    }
    // clean up state parameters
    state = {
        cardNumber: "",
        anySlotAvailable: false,
        // startup: false,
        currentIndex: 0,
        availability: null,
        reserveButtonActive: false,
        selectedSlots: []
    };
    // clean up slots
    /*
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
    }*/
    bottomButtons = getBlankButtons();
}

/**
 * Event that takes an argument based on event listener assignment
 * This is called whenever any of the bottom buttons is pressed
 * @param day
 * @param slot
 */
function bottomButton(day, slot){
    interactionState.interact();
    // if slot is available
    if(bottomButtons[day - 1]['slots'][slot - 1]['status'] === 'available') {
        // if it can be selected- mark it as selected
        if(selectSlot(day, slot)) {
            bottomButtons[day - 1]['slots'][slot - 1]['selected'] = true;
        }
    }
    // if slot is already selected - DO NOTHING: let selectSlot handle it
    // (it may require breaking off a chunk of the array).
    else if(bottomButtons[day - 1]['slots'][slot - 1]['selected'] === true){
        selectSlot(day, slot);
    }else{
        error(config.SLOT_UNAVAILABLE, 0);
    }
    // console.log(state.selectedSlots);
    console.log(state.selectedSlots);
    renderSlots();
}

/**
 * Returns true if slot is able to change to 'selected', false if not
 * Modifies slot selection array for generation of ISO time range for booking
 * @param day
 * @param slot
 */
function selectSlot(day, slot){
    //NOTE: Conditions must be present so this is only
    // nothing is selected
    if(state.selectedSlots.length === 0){
        state.selectedSlots[0] = parseInt(bottomButtons[day - 1 ]['slots'][slot - 1]['id']);
        return true;
        // add this to make sure selected items are checked at end
    }else if(bottomButtons[day - 1]['slots'][slot - 1]['selected'] === false){
        if(state.selectedSlots.length === config.MAX_SELECTED_SLOTS){
            error(config.MAX_SLOTS_SELECTED, 0);
            return false;
        }
        // check to see if slot is adjacent to selected slot
        // (difference between ids is 1 away from first or last item in array)
        if(bottomButtons[day - 1]['slots'][slot - 1]['id'] - state.selectedSlots[state.selectedSlots.length - 1] === 1){
            // if one above - add to end of array
            state.selectedSlots.push(bottomButtons[day - 1]['slots'][slot - 1]['id']);
            return true;
        }else if(state.selectedSlots[0] - bottomButtons[day - 1]['slots'][slot - 1]['id'] === 1){
            // if one below - shift array to right
            state.selectedSlots.unshift(bottomButtons[day - 1]['slots'][slot - 1]['id']);
            return true;
        }else{
            return false;
        }
        // if not adjacent to array - return false
    }
    // if selected
    if(bottomButtons[day - 1]['slots'][slot - 1]['selected'] === true) {
        // drop selection if at BEGINNING
        if(parseInt(bottomButtons[day - 1 ]['slots'][slot - 1]['id']) === state.selectedSlots[0]){
            state.selectedSlots.shift();
            bottomButtons[day - 1]['slots'][slot - 1]['selected'] = false;
            console.log(bottomButtons);
            return false;
        }
        // drop selection if at END of array
        if(parseInt(bottomButtons[day - 1 ]['slots'][slot - 1]['id']) === state.selectedSlots[state.selectedSlots.length - 1]){
            state.selectedSlots.pop();
            bottomButtons[day - 1]['slots'][slot - 1]['selected'] = false;
            console.log(bottomButtons);
            return false;
        }
        // drop FROM current to END of array if NOT and END of array
        /*
        //THIS IS COMPLETELY BROKEN!!
        if(state.selectedSlots.indexOf(parseInt(bottomButtons[day - 1 ]['slots'][slot - 1]['id'])) > 0){
            let index = state.selectedSlots.indexOf(parseInt(bottomButtons[day - 1 ]['slots'][slot - 1]['id']));
            for(let g = index; g < state.selectedSlots.length; g++){

                bottomButtons[day - 1]['slots'][g - 1]['selected'] = false;
                console.log(g);
            }
            state.selectedSlots.splice(index + 1);
        }*/
        // return true - selecting an already selected slot makes modification to the data structure
        // this condition won't be checked by the event as it has the potential to affect more than one
        // slot's selection
        return false;
    }
    return false;
}

/**
 * Support function returns the slot of the bottomButtons model by id
 * @param id
 * @returns {*}
 */
function getSlotById(id){
    for(let i = 0; i < bottomButtons.length; i++){
        for(let j = 0; j < bottomButtons[i]['slots'].length; j++){
            if(bottomButtons[i]['slots'][j]['id'] !== "undefined"){
                if(parseInt(bottomButtons[i]['slots'][j]['id']) === id){
                    return bottomButtons[i]['slots'][j]
                }
            }
        }
    }
    return false;
}



/**
 * Override default mouse functions to prevent press-hold right click.
 * @param e
 * context menu's default object which is the mouse event
 */
window.oncontextmenu = function(e){
    // TODO: Uncomment this for production
    // e.preventDefault();
}

/**
 * Anonymous callback from self-invoked time display function
 */
function renderTime(timeContainerElement){
    document.getElementById(timeContainerElement).innerHTML = state['time'];
    // rendering Date as well
    // Removed Element for Zoop
    // document.getElementById("currentDateContainer").innerHTML = state['date'];
}

/**
 * Renders Error modal to screen with message
 * @param message
 * @param system - If set to 1, treats as system error - this is for future error management implementation
 * System set to 2 treats as LibCal Error indicating bad config or client application error
 */
function error(message, system){
    
    renderModal("errorModal");
    document.getElementById("errorMiddle").innerHTML = message;
    let type = system - 1;
    if(system === 1){
        submitError(message, type)
    }
}

/**
 * Function stub - future version will be able to report client system errors to server
 * @param message error message 
 * @param type type of error
 */
function submitError(message, type){
    // TODO: Implement some server and client-side handling and reporting of these
    if(type === 1){
        console.log("SYSTEM ERROR: " + message);    
    }else{
        console.log("LIB-CAL ERROR: " + message);
    }
}


/**
 * @param element
 * Plain text name of element of modal that is to be rendered
 * A Model rendering is just displaying it to the screen. Different Modals have
 * different functions so a template doesn't work.
 */
function renderModal(element){
    state.activeModal = true;
    for(let i = 0; i < globals.MODALS.length; i++){
        if(element === globals.MODALS[i]){
            document.getElementById(globals.MODALS[i]).style.display = "block";
        }else{
            document.getElementById(globals.MODALS[i]).style.display = "none";
        }
    }
    for(let i = 0; i < globals.SCREENS.length; i++){
        // make all screens opaque
        document.getElementById(globals.SCREENS[i]).className = "screen opaque";
    }
}

/**
 * Server makes call to API - This is the result of said API passed back to the web client
 * @param message
 */
function resultModal(message){
    document.getElementById("resultMiddle").innerHTML = message;
    renderModal("resultModal");
}

/**
 * Close modal: Close all modals and remove opacity filter
 */
function closeModal(){
    state.activeModal = false;
    for(let i = 0; i < globals.MODALS.length; i++){
        document.getElementById(globals.MODALS[i]).style.display = "none";
    }
    for(let i = 0; i < globals.SCREENS.length; i++){
        // make all screens clear (but NOT displayed)
        document.getElementById(globals.SCREENS[i]).className = "screen";
    }
}

/**
 * @param element
 * Plain text name of the root element of the screen to be rendered
 */
function renderScreen(element){
    for(let i = 0; i < globals.SCREENS.length; i++){
        // make all screens clear (but NOT displayed)
        // document.getElementById(config.SCREENS[i]).className = "screen";
        if(element === globals.SCREENS[i]){
            document.getElementById(element).style.display = "block";
        }else{
            document.getElementById(globals.SCREENS[i]).style.display = "none";
        }
    }
    closeModal();
}

/**
 * Added listener for reserve button
 * If something is selected and this button is active, render confirmation window
 */
function makeReservation(){
    // Note: Selected Slots is an array for in case we implement selecting multiple slots at once.
    if(state.reserveButtonActive){
        // console.log(bottomButtons[state.selectedSlots[0]]);
        let templatePartials = config.CONFIRMATION_PROMPT.split("#", 3);
        document.getElementById("confirmationMiddle").innerHTML =
            templatePartials[0] +
            getSlotById(state.selectedSlots[0])['from-display'] +
            templatePartials[1] +
            //bottomButtons[state.selectedSlots[0]]['to-display'] +
            getSlotById(state.selectedSlots[state.selectedSlots.length - 1])['to-display'] +
            templatePartials[2];
        renderModal("confirmationModal");
    }
}

/**
 * Clears out selection state in the case of idling out, cancel after booking confirm, cancel swipe
 */
function clearSelection(){
    bottomButtons = getBlankButtons();
}

/**
 * Render the results to the screen, calls for construction of model
 * @param serverReply
 * the JSON response from the server with the state and slot info
 */
function renderMainScreen(serverReply){
    // snap Server's reply to Global State
    state['reply'] = serverReply;
    // render the big display colors (Color Bar and Ribbon)
    // render the text (avail, room number)
    document.getElementById("locationContainer").innerHTML = serverReply["room-display-text"]
    if(serverReply["available"]){
        // Text
        document.getElementById("statusContainer").innerHTML = "Available"
        // Left Color Bar
        document.getElementById("leftColorBar").classList.remove('unavailable');
        document.getElementById("leftColorBar").classList.add('available');
        // Right Ribbon
        document.getElementById("rightRibbon").classList.remove('unavailable');
        document.getElementById("rightRibbon").classList.add('available');
    }else{
        // Text
        document.getElementById("statusContainer").innerHTML = "Unavailable"
        // Left Color Bar
        document.getElementById("leftColorBar").classList.remove('available');
        document.getElementById("leftColorBar").classList.add('unavailable');
        // Right Ribbon
        document.getElementById("rightRibbon").classList.remove('available');
        document.getElementById("rightRibbon").classList.add('unavailable');
    }
    // populate the bottom buttons object array with appropriate data
    getDisplayTimesToButtonObject();
}

/**
 * Makes the call to the server make LibCal booking
 * @param bannerID
 * Patrons 9-digit ID
 * @param startISO
 * ISO String for the beginning time
 * @param endISO
 * ISO String for the end time
 * @param roomID
 * string for the LibCal ID
 */
function bookNow(bannerID, startISO, endISO, roomID){
    interactionState.interactTime(config.MAX_API_WAIT_TIME);
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
        if(this.readyState === 4){
            // interact();
            if(this.status === 200){
                let reply = JSON.parse(this.responseText);
                if(reply['booking_id'] !== undefined){
                    resultModal("Booking Successful!");
                }else if(reply['error'] !== undefined){
                    resultModal("Error: " + reply['error'])
                }else{
                    error(this.responseText);
                }

            }else{
                // bookingModal('{"error": "SERVER ERROR"}');
                error(this.responseText, 1);
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
    console.log(state.cardNumber);
    if(/^[0-9]$/i.test(e.key)){
        state.cardNumber+= e.key;
    }
    if(state['cardNumber'].length === 9){
        // console.log("BID: " + state["card_number"]);
        let startISO = getSlotById(state.selectedSlots[0])['from-iso'];
        let endISO = getSlotById(state.selectedSlots[state.selectedSlots.length - 1])['to-display'];
        let roomID = state['reply']['id'];
        window.removeEventListener("keydown", processKey, true);
        let cardNumber = state.cardNumber;
        state.cardNumber = "";
        // error(startISO + " " + endISO + " " + roomID + " " + cardNumber);
        bookNow(cardNumber, startISO, endISO, roomID);
    }
}

/**
 * Function to get the data from the server and send it to the populate function
 */
function makeAjaxCall(){
    // console.log(state.startup)
    if(state.startup === false){
        document.getElementById("locationContainer").innerHTML = "Getting New Data...";
        state.startup = true;
    }
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
        if(this.readyState === 4){
            if(this.status !== 200){
                if(this.status === 500){
                    error(config.DEAD_SERVER, 1);
                }
            }else{
                if(!interactionState.isInteracting()){
                    let JSONReply = JSON.parse(this.responseText);
                    if(JSONReply['errors']){
                        error(JSONReply['errors'][0], 2);
                    }else {
                        cleanup();
                        renderMainScreen(JSONReply);
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
    // set static items
    document.getElementById("mainInstructionText").innerHTML = config.MAIN_INSTRUCTION_TEXT;
    document.getElementById("instructionSubtext").innerHTML = config.SUB_INSTRUCTION_TEXT;
    // declare main loop that's always running
    // this is in a variable in case it ever needs to be addressed.
    const mainLoop = setInterval(function(){
        if(!interactionState.isInteracting()){
            makeAjaxCall();
        }
    }, config['GET_STATE_INTERVAL']);
    // add event listeners to bottom row of buttons
    for(let i = 1; i < 3; i++){
        for(let j = 1; j < 49; j++){
            document.getElementById("d" + i + "s" + j).addEventListener('click', function(){
                interactionState.interact();
                bottomButton(i,j);
            });
        }
    }
    // add listeners to other buttons
    // =======================================================================================================
    // RESERVE BUTTON
    document.getElementById("reserveButton").addEventListener('click', function(){
        interactionState.interact();
        makeReservation();
    });

    // CANCEL BOOKING - KEEP SELECTION - RETURN TO MAIN
    document.getElementById("cancelConfirmationButton").addEventListener('click', function(){
        interactionState.interactTime(config.SWIPE_TIMEOUT);
        closeModal();
    });

    // OK BOOKING - MOVE TO SWIPE ID SCREEN
    document.getElementById("confirmationButton").addEventListener('click', function(){
        interactionState.interactTime(config.SWIPE_TIMEOUT);
        window.addEventListener("keydown", processKey, true);
        /*
        * Some logic needs to be here to prepare the renderer as if a 'success' comes back from the server, the model
        * is no longer valid and the screen should be at a place to re-render anyway to reflect the booking.
        * */
        renderScreen("instructionScreen");
    });

    // ERROR CLOSE
    document.getElementById("errorClose").addEventListener('click', function(){
        // interactionState.endInteraction();
        // TODO: Investigate this. Interaction state ending means resetting a lot of model data that could
        // possibly still be in use.
        closeModal();
    });

    // INSTRUCTION CANCEL
    // Clears Application State - opens to server reply
    document.getElementById("instructionCancel").addEventListener('click', function(){
        interactionState.endInteraction();
        renderScreen("appContainer");
    });

    // RESULT MODAL CLOSE
    // Reloads App
    document.getElementById("resultCloseButton").addEventListener('click', function(){
        interactionState.endInteraction();
        closeModal();
        makeAjaxCall();
    });
})()
