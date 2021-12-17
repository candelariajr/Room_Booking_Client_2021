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
    SLOT_COUNT: 8, // to be removed when Zoop is added in the future
    ZOOP: false,
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
            // TODO: Update this
            // noinspection JSDeprecatedSymbols
            location.reload(true);
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
 * @type {[{pageLeft: boolean, ISOBeginTime: null, ISOEndTime: null, time: null, availability: null, selected: boolean}, {ISOBeginTime: null, ISOEndTime: null, time: null, availability: null, selected: boolean}, {ISOBeginTime: null, ISOEndTime: null, time: null, availability: null, selected: boolean}, {ISOBeginTime: null, ISOEndTime: null, time: null, availability: null, selected: boolean}, {ISOBeginTime: null, ISOEndTime: null, time: null, availability: null, selected: boolean}, null, null, null]}
 * @time: display time
 * @ISOBeginTime: ISO format of start of booking slot
 * @ISOEndTIme: ISO format of end time of booking slot (ISO times are needed by the API).
 */
let bottomButtons = []
for(let i = 0; i < globals.SLOT_COUNT; i++){
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
        error(config.UNABLE_TO_LOAD_DATA, 1);
        return;
    }
    // There are at least 8 slots here
    if(state['reply']['days'][0]['time-slots'].length >= bottomButtons.length){
        for(let i = 0; i < bottomButtons.length; i++) {
            setSlotData(0, i, i)
        }
    }else{
        // pick up the last slots of the current day and the ones from the next day for a total of 8
        let firstDaySlotCount = state['reply']['days'][0]['time-slots'].length;
        let secondDaySlotCount = bottomButtons.length - firstDaySlotCount;
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
    // if slot is available
    if(bottomButtons[i]['availability'] === 'available'){
        // if nothing else is selected
        if(!state.reserveButtonActive){
            bottomButtons[i]['selected'] = true;
            state.selectedSlots[0] = i;
            state.reserveButtonActive = true;
            // if slot is already selected
        }else if(i === state.selectedSlots[0]){
            bottomButtons[i]['selected'] = false;
            state.selectedSlots[0] = null;
            state.reserveButtonActive = false;
            // if different slot is selected
        }else{
            bottomButtons[state.selectedSlots[0]]['selected'] = false;
            bottomButtons[i]['selected'] = true;
            state.selectedSlots[0] = i;
        }
    }else{
        error(config.SLOT_UNAVAILABLE, 0);
    }
    renderSlots();
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
 */
function error(message, system){
    renderModal("errorModal");
    document.getElementById("errorMiddle").innerHTML = message;
    if(system === 1){
        submitError(message)
    }
}

/**
 * Function stub - future version will be able to report client system errors to server
 * @param message
 */
function submitError(message){
    console.log("ERROR: " + message);
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
        console.log(bottomButtons[state.selectedSlots[0]]);
        let templatePartials = config.CONFIRMATION_PROMPT.split("#", 3);
        document.getElementById("confirmationMiddle").innerHTML =
            templatePartials[0] +
            bottomButtons[state.selectedSlots[0]]['time']  +
            templatePartials[1] +
            bottomButtons[state.selectedSlots[0]]['endTime'] +
            templatePartials[2];
        renderModal("confirmationModal");
    }
}

/**
 * Clears out selection state in the case of idling out, cancel after booking confirm, cancel swipe
 */
function clearSelection(){
    for(let i = 0; i < bottomButtons.length; i++){
        bottomButtons[i].selected = false;
    }
    state.reserveButtonActive = false;
    state.selectedSlots = [];
}

/**
 * Render the results to the screen, calls for construction of model
 * @param serverReply
 * the JSON response from the server with the state and slot info
 */
function renderMainScreen(serverReply){
    // snap Server reply to Global State
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
 * Patrons 9 digit ID
 * @param startISO
 * ISO string for the beginning time
 * @param endISO
 * ISO string for the end time
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
                resultModal(this.responseText);
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
        let startISO = bottomButtons[state.selectedSlots[0]].ISOBeginTime;
        let endISO = bottomButtons[state.selectedSlots[0]].ISOEndTime;
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
                //TODO: Need some kind of handling here - would love to use a popup or cancel
                //TODO: but apparently someone has decided it's not ADA friendly.
                //TODO: It has nothing to do with that
                if(this.status === 500){
                    error(config.DEAD_SERVER, 1);
                }
            }else{
                if(!interactionState.isInteracting()){
                    let JSONReply = JSON.parse(this.responseText);
                    if(JSONReply['error']){
                        error(JSONReply['error'], 1);
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
    let mainLoop = setInterval(function(){
        if(!interactionState.isInteracting()){
            makeAjaxCall();
        }
    }, config['GET_STATE_INTERVAL']);
    // add event listeners to bottom row of buttons
    for(let i = 0; i < 8; i++){
        document.getElementById("s" + i).addEventListener('click', function(){
            interactionState.interact();
            bottomButton(i);
        });
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
        interactionState.endInteraction();
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
