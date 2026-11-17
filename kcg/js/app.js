
// =============================================
// KASUBAY - APPLICATION INTERACTIONS
// =============================================

const searchToggle = document.getElementById("searchToggle");
const searchPanel = document.getElementById("searchPanel");

const menuToggle = document.getElementById("menuToggle");
const menuPanel = document.getElementById("menuPanel");

const searchInput = document.getElementById("locationSearch");
const searchResults = document.getElementById("searchResults");


// =============================================
// HAMBURGER MENU
// =============================================

menuToggle.addEventListener("click", function() {

    menuPanel.classList.toggle("active");

    searchPanel.classList.remove("active");

});


// =============================================
// SEARCH PANEL
// =============================================

searchToggle.addEventListener("click", function() {

    searchPanel.classList.toggle("active");

    menuPanel.classList.remove("active");

    if (searchPanel.classList.contains("active")) {
        searchInput.focus();
    }

});


// =============================================
// SEARCH LOCATIONS
// =============================================

searchInput.addEventListener("input", function() {

    const query = searchInput.value.toLowerCase().trim();

    searchResults.innerHTML = "";

    if (!query) return;

    const results = campusLocations.filter(function(location) {

        return location.name.toLowerCase().includes(query);

    });

    if (results.length === 0) {

        searchResults.textContent = "No locations found.";

        return;

    }

    results.forEach(function(location) {

        const result = document.createElement("div");

        result.className = "search-result";
        result.textContent = location.name;

        result.addEventListener("click", function() {

            const x = mapImageWidth * (location.x / 100);
            const y = mapImageHeight * (1 - location.y / 100);

            campusMap.setView([y, x], 0.5);

            showLocation(location);

            searchPanel.classList.remove("active");

            searchInput.value = "";
            searchResults.innerHTML = "";

        });

        searchResults.appendChild(result);

    });

});


// =============================================
// RESET MAP
// =============================================

document.getElementById("resetButton")
    .addEventListener("click", function() {

        if (campusMap) {
            campusMap.fitBounds([
                [0, 0],
                [mapImageHeight, mapImageWidth]
            ]);
        }

        closeLocation();

        menuPanel.classList.remove("active");

    });


// =============================================
// ABOUT KASUBAY
// =============================================

document.getElementById("aboutButton")
    .addEventListener("click", function() {

        alert(
            "KasUbAy\n\n" +
            "University of Antique Campus Guide\n\n" +
            "Helping students and visitors explore the campus."
        );

        menuPanel.classList.remove("active");

    });
