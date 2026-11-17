
// SEARCH PANEL

const searchToggle = document.getElementById("searchToggle");

const searchPanel = document.getElementById("searchPanel");

const locationSearch = document.getElementById("locationSearch");

const searchResults = document.getElementById("searchResults");


searchToggle.addEventListener("click", function() {

    searchPanel.classList.toggle("active");

    document.getElementById("menuPanel").classList.remove("active");

    if (searchPanel.classList.contains("active")) {
        locationSearch.focus();
    }

});


// SEARCH LOCATIONS

locationSearch.addEventListener("input", function() {

    const query = locationSearch.value.toLowerCase();

    searchResults.innerHTML = "";

    const results = campusLocations.filter(function(location) {

        return location.name.toLowerCase().includes(query);

    });

    results.forEach(function(location) {

        const result = document.createElement("div");

        result.className = "search-result";

        result.textContent = location.name;

        result.addEventListener("click", function() {

            showLocation(location);

            searchPanel.classList.remove("active");

        });

        searchResults.appendChild(result);

    });

});


// MENU PANEL

const menuToggle = document.getElementById("menuToggle");

const menuPanel = document.getElementById("menuPanel");


menuToggle.addEventListener("click", function() {

    menuPanel.classList.toggle("active");

    searchPanel.classList.remove("active");

});


// RESET MAP

document.getElementById("resetButton").addEventListener("click", function() {

    closeLocation();

    menuPanel.classList.remove("active");

    searchPanel.classList.remove("active");

});


// ABOUT BUTTON

document.getElementById("aboutButton").addEventListener("click", function() {

    showStatus("KasUbAy - University of Antique Campus Guide");

    menuPanel.classList.remove("active");

});


// LOCATION BUTTON

document.getElementById("locateButton").addEventListener("click", function() {

    showStatus("Location identification is not configured yet. QR-based positioning will be added later.");

});


// STATUS MESSAGE

function showStatus(message) {

    const status = document.getElementById("statusMessage");

    status.textContent = message;

    status.style.display = "block";

    setTimeout(function() {

        status.style.display = "none";

    }, 3000);

}


console.log("KasUbAy is running!");
