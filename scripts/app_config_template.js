
// Declaration of global config object used for display text
const config = {
    SERVER_SCRIPT_URL : "",
    MAX_SELECTED_SLOTS: 4,
    // How often the main loop keeps polling the server
    GET_STATE_INTERVAL: 10000,
    // Time in hours minutes seconds the site reloads (this is to allow for overnight updates and also cache cleaning)
    RELOAD_TIME: "3:00:00AM",
    //They tell me not to do this, but I KNOW that we'll need it. Keeping it. Just making it lest noticeable
    //before changing it during implementation.
    SWIPE_TIMEOUT: 40000,
    //One Hour
    //INTERACTION_TIMEOUT: 3600000
    // 5 minutes
    INTERACTION_TIMEOUT: 300000,
    // Strings
    CONFIRMATION_PROMPT: "You are reserving this room from # to #.",
    FIRST_INSTRUCTION_TEXT: "Tap a Slot to Start",
    UNABLE_TO_LOAD_DATA: "No Data Available",
    TAP_RESERVE: "Tap 'Reserve' to Continue",
    SLOT_UNAVAILABLE: "Slot is not available",
    NEXT_AVAILABLE: "Unavailable: Opens at #.",
    DEAD_SERVER: "Server is Down",
    MAIN_INSTRUCTION_TEXT: "Swipe App Card",
    SUB_INSTRUCTION_TEXT: "Magnetic Stripe Faces Away From You",
    //This is the maximum time to wait for a response from the API call before resetting
    //This doesn't benefit anything, but prevents the app from locking up if the server is slow enough
    // to time out the API request
    MAX_API_WAIT_TIME: 60000
};
