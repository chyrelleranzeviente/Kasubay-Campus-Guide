
/* =============================================
   KASUBAY - MAP, WAYPOINTS AND CAMPUS BOUNDARY
============================================= */

let campusMap;
let markerLayer;
let mapImageWidth;
let mapImageHeight;

let positioningMode = false;
let editingMode = false;
let removalMode = false;

let pendingCoordinates = null;
let pendingEditLocationId = null;
let pendingDeleteLocation = null;
let selectedLocationId = null;

// CAMPUS BOUNDARY DATA
const DEFAULT_CAMPUS_BOUNDARY = [
    [55.5,6.6],[56.9,7.9],[57.2,11],[55.7,13.6],
    [56.4,17.9],[57.5,24.5],[59.7,34.3],[64.3,46.3],
    [68.4,57.5],[71,67.9],[72.2,77.6],[72.2,86],
    [71.6,91],[66.4,92],[58.2,92.1],[49.3,91.8],
    [42.1,92],[41.3,86.6],[41.5,77.6],[41.2,69.4],
    [40.3,63.6],[36.6,58.2],[32.5,52.2],[29,46.4],
    [23.9,41.5],[18.8,37.2],[16.3,33.1],[15.7,29.4],
    [19.7,27],[16,25.2],[16.3,23.6],[22.4,21.6],
    [30.6,20.7],[37.8,19.9],[40.6,18.7],[41,16.9],
    [44,16.1],[47.3,16.6],[49.1,15.2],[49.3,11.6],
    [48.7,8.8],[50.3,7]
];

let campusBoundaryPercent = [];
let savedCampusBoundaryPercent = [];
let campusBoundaryLayer = null;
let boundaryHandleLayer = null;
let boundaryEditingMode = false;
let boundaryToolbar = null;


// =============================================
// HTML ELEMENTS
// =============================================

const locationCard = document.getElementById("locationCard");
const locationName = document.getElementById("locationName");
const locationDescription = document.getElementById("locationDescription");
const locationPhoto = document.getElementById("locationPhoto");
const locationHours = document.getElementById("locationHours");
const locationAddress = document.getElementById("locationAddress");

const waypointModal = document.getElementById("waypointModal");
const waypointName = document.getElementById("waypointName");
const waypointDescription = document.getElementById("waypointDescription");
const waypointPhoto = document.getElementById("waypointPhoto");
const waypointHours = document.getElementById("waypointHours");
const waypointAddress = document.getElementById("waypointAddress");

const statusMessage = document.getElementById("statusMessage");

const deleteConfirmModal = document.getElementById("deleteConfirmModal");
const deleteConfirmMessage = document.getElementById("deleteConfirmMessage");


// =============================================
// STATUS MESSAGE
// =============================================

function showStatus(message) {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.classList.add("visible");
}


// =============================================
// WAYPOINT SAVE AND LOAD
// =============================================

function loadSavedLocations() {
    try {
        const saved = JSON.parse(
            localStorage.getItem("kasubayLocations")
        ) || [];

        saved.forEach(function(item) {
            const index = campusLocations.findIndex(
                location => location.id === item.id
            );

            if (index === -1) {
                campusLocations.push(item);
            } else {
                campusLocations[index] = {
                    ...campusLocations[index],
                    ...item
                };
            }
        });

    } catch (error) {
        console.error("Could not load waypoints:", error);
    }
}

function saveLocations() {
    try {
        localStorage.setItem(
            "kasubayLocations",
            JSON.stringify(campusLocations)
        );
        return true;

    } catch (error) {
        console.error("Could not save waypoints:", error);
        showStatus("Unable to save waypoint.");
        return false;
    }
}


// =============================================
// MAP INITIALIZATION
// =============================================

function initializeMap() {

    if (typeof L === "undefined") {
        showStatus("Map library could not load.");
        return;
    }

    const mapImage = new Image();

    mapImage.onload = function() {

        mapImageWidth = mapImage.naturalWidth;
        mapImageHeight = mapImage.naturalHeight;

        const bounds = [
            [0, 0],
            [mapImageHeight, mapImageWidth]
        ];

        campusMap = L.map("campusMap", {
            crs: L.CRS.Simple,
            minZoom: -2,
            maxZoom: 2,
            zoomSnap: 0.1,
            zoomDelta: 0.25,
            zoomControl: false,
            attributionControl: true,
            maxBounds: bounds,
            maxBoundsViscosity: 0.10
        });

        campusMap.getContainer().style.pointerEvents = "auto";

        L.imageOverlay(
            "assets/pics/uamap.jpg.jpg",
            bounds,
            { interactive: true }
        ).addTo(campusMap);

        // SOFT WHITE MAP OVERLAY
        campusMap.createPane("softenPane");
        campusMap.getPane("softenPane").style.zIndex = 450;
        campusMap.getPane("softenPane").style.pointerEvents = "none";

        L.rectangle(bounds, {
            pane: "softenPane",
            stroke: false,
            fillColor: "#ffffff",
            fillOpacity: 0.22,
            interactive: false
        }).addTo(campusMap);

        // CAMPUS BOUNDARY PANE
        campusMap.createPane("campusBoundaryPane");
        campusMap.getPane("campusBoundaryPane").style.zIndex = 500;
        campusMap.getPane("campusBoundaryPane").style.pointerEvents = "none";

        // BOUNDARY EDIT HANDLES PANE
        campusMap.createPane("boundaryEditPane");
        campusMap.getPane("boundaryEditPane").style.zIndex = 680;
        campusMap.getPane("boundaryEditPane").style.pointerEvents = "auto";

        loadSavedCampusBoundary();
        drawCampusBoundary();

        // WAYPOINT PANE
        campusMap.createPane("waypointPane");
        campusMap.getPane("waypointPane").style.zIndex = 650;
        campusMap.getPane("waypointPane").style.pointerEvents = "auto";

        markerLayer = L.layerGroup().addTo(campusMap);

        L.control.zoom({
            position: "bottomright"
        }).addTo(campusMap);

        campusMap.fitBounds(bounds);

        loadSavedLocations();
        renderMarkers();

        campusMap.getContainer().addEventListener(
            "click",
            handleMapClick
        );

        campusMap.on("click", handleBoundaryMapClick);

        createBoundaryMenuButton();
        createBoundaryEditorToolbar();

        console.log("KasUbAy map initialized.");
        console.log("Loaded waypoints:", campusLocations.length);
    };

    mapImage.onerror = function() {
        showStatus("Campus map image could not load.");
        console.error("Map image failed to load.");
    };

    mapImage.src = "assets/pics/uamap.jpg.jpg";
}


// =============================================
// CAMPUS BOUNDARY: LOAD AND DRAW
// =============================================

function loadSavedCampusBoundary() {
    try {
        const saved = JSON.parse(
            localStorage.getItem("kasubayBoundary")
        );

        campusBoundaryPercent =
            Array.isArray(saved) && saved.length >= 3
                ? saved
                : DEFAULT_CAMPUS_BOUNDARY.map(point => [...point]);

    } catch (error) {
        console.error("Could not load campus boundary:", error);
        campusBoundaryPercent =
            DEFAULT_CAMPUS_BOUNDARY.map(point => [...point]);
    }

    savedCampusBoundaryPercent =
        campusBoundaryPercent.map(point => [...point]);
}

function boundaryPercentToLatLng(point) {
    return [
        mapImageHeight * (1 - point[1] / 100),
        mapImageWidth * (point[0] / 100)
    ];
}

function boundaryLatLngToPercent(latlng) {
    return [
        Number(((latlng.lng / mapImageWidth) * 100).toFixed(2)),
        Number(((1 - latlng.lat / mapImageHeight) * 100).toFixed(2))
    ];
}

function drawCampusBoundary() {
    if (!campusMap) return;

    if (campusBoundaryLayer) {
        campusMap.removeLayer(campusBoundaryLayer);
    }

    const coordinates = campusBoundaryPercent.map(
        boundaryPercentToLatLng
    );

    campusBoundaryLayer = L.polygon(coordinates, {
        pane: "campusBoundaryPane",
        color: "#FFD84D",
        weight: 4,
        opacity: 0.82,
        lineJoin: "miter",
        lineCap: "square",
        fillColor: "#17221B",
        fillOpacity: 0.30,
        interactive: false
    }).addTo(campusMap);

    if (boundaryEditingMode) {
        renderBoundaryHandles();
    }
}


// =============================================
// BOUNDARY EDITOR MENU BUTTON
// =============================================

function createBoundaryMenuButton() {
    const menuPanel = document.getElementById("menuPanel");

    if (!menuPanel ||
        document.getElementById("editBoundaryButton")) {
        return;
    }

    const button = document.createElement("button");

    button.id = "editBoundaryButton";
    button.type = "button";
    button.textContent = "Edit Campus Boundary";

    button.style.cssText =
        "display:block;width:100%;padding:12px;border:0;" +
        "background:transparent;text-align:left;cursor:pointer;";

    button.addEventListener("mouseenter", function() {
        button.style.background = "#f2f2f2";
    });

    button.addEventListener("mouseleave", function() {
        button.style.background = "transparent";
    });

    button.addEventListener(
        "click",
        activateBoundaryEditingMode
    );

    menuPanel.appendChild(button);
}


// =============================================
// BOUNDARY EDITOR TOOLBAR
// =============================================

function createBoundaryEditorToolbar() {

    const mapContainer = campusMap.getContainer();

    boundaryToolbar = document.createElement("div");
    boundaryToolbar.id = "boundaryEditorToolbar";

    boundaryToolbar.style.cssText = [
        "display:none",
        "position:absolute",
        "top:12px",
        "left:50%",
        "transform:translateX(-50%)",
        "z-index:1000",
        "background:#ffffff",
        "padding:10px",
        "border-radius:12px",
        "box-shadow:0 4px 18px rgba(0,0,0,.25)",
        "width:max-content",
        "max-width:calc(100% - 24px)",
        "gap:7px",
        "flex-wrap:wrap",
        "justify-content:center"
    ].join(";");

    function makeButton(id, label, background) {

        const button = document.createElement("button");

        button.id = id;
        button.type = "button";
        button.textContent = label;

        button.style.cssText =
            "border:0;border-radius:7px;padding:10px 12px;" +
            "font-size:13px;font-weight:600;cursor:pointer;" +
            "background:" + background + ";color:" +
            (background === "#eeeeee" ? "#333" : "#fff");

        button.addEventListener("click", function(event) {
            event.stopPropagation();
        });

        return button;
    }

    boundaryToolbar.append(
        makeButton("undoBoundaryPoint", "Undo Point", "#555555"),
        makeButton("saveCampusBoundary", "Save Boundary", "#23834b"),
        makeButton("cancelCampusBoundary", "Cancel", "#eeeeee")
    );

    mapContainer.appendChild(boundaryToolbar);

    document.getElementById("undoBoundaryPoint")
        .addEventListener("click", undoBoundaryPoint);

    document.getElementById("saveCampusBoundary")
        .addEventListener("click", saveCampusBoundary);

    document.getElementById("cancelCampusBoundary")
        .addEventListener("click", cancelCampusBoundary);
}


// =============================================
// ACTIVATE BOUNDARY EDITING
// =============================================

function activateBoundaryEditingMode() {

    if (!campusMap) return;

    clearModes();

    boundaryEditingMode = true;

    campusMap.getContainer().classList.add(
        "campus-boundary-editing-active"
    );

    document.getElementById("menuPanel")
        .classList.remove("active");

    closeLocation();

    savedCampusBoundaryPercent =
        campusBoundaryPercent.map(point => [...point]);

    boundaryToolbar.style.display = "flex";

    campusMap.dragging.disable();

    renderBoundaryHandles();

    showStatus(
        "Boundary editor: Click to add points or drag yellow handles."
    );
}


// =============================================
// BOUNDARY HANDLES
// =============================================

function renderBoundaryHandles() {

    if (!campusMap || !boundaryEditingMode) return;

    if (boundaryHandleLayer) {
        campusMap.removeLayer(boundaryHandleLayer);
    }

    boundaryHandleLayer = L.layerGroup().addTo(campusMap);

    campusBoundaryPercent.forEach(function(point, index) {

        const handle = L.marker(
            boundaryPercentToLatLng(point),
            {
                pane: "boundaryEditPane",
                draggable: true,
                keyboard: false,

                icon: L.divIcon({
                    className: "boundary-edit-handle",
                    html:
                        '<div style="width:14px;height:14px;' +
                        'background:#ffd84d;border:3px solid #fff;' +
                        'border-radius:50%;box-shadow:0 1px 5px #000;' +
                        'cursor:grab;"></div>',
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                }),

                bubblingMouseEvents: false
            }
        );

        handle.on("drag", function(event) {

            campusBoundaryPercent[index] =
                boundaryLatLngToPercent(
                    event.target.getLatLng()
                );

            updateBoundaryPolygonDuringEdit();
        });

        handle.on("dragend", function() {
            renderBoundaryHandles();
        });

        boundaryHandleLayer.addLayer(handle);
    });
}

function updateBoundaryPolygonDuringEdit() {

    if (!campusBoundaryLayer ||
        campusBoundaryPercent.length < 3) {
        return;
    }

    campusBoundaryLayer.setLatLngs(
        campusBoundaryPercent.map(boundaryPercentToLatLng)
    );
}


// =============================================
// ADD AND UNDO BOUNDARY POINTS
// =============================================

function handleBoundaryMapClick(event) {

    if (!boundaryEditingMode) return;

    if (
        event.originalEvent &&
        event.originalEvent.target.closest(".leaflet-control")
    ) {
        return;
    }

    if (
        event.originalEvent &&
        event.originalEvent.target.closest("#boundaryEditorToolbar")
    ) {
        return;
    }

    campusBoundaryPercent.push(
        boundaryLatLngToPercent(event.latlng)
    );

    drawCampusBoundary();

    showStatus(
        "Boundary point added. Drag the yellow handles to adjust corners."
    );
}

function undoBoundaryPoint() {

    if (campusBoundaryPercent.length <= 3) {
        showStatus("A boundary needs at least three points.");
        return;
    }

    campusBoundaryPercent.pop();

    drawCampusBoundary();

    showStatus("Last boundary point removed.");
}


// =============================================
// SAVE AND CANCEL BOUNDARY
// =============================================

function saveCampusBoundary() {

    if (campusBoundaryPercent.length < 3) {
        showStatus("Add at least three boundary points before saving.");
        return;
    }

    try {

        localStorage.setItem(
            "kasubayBoundary",
            JSON.stringify(campusBoundaryPercent)
        );

        savedCampusBoundaryPercent =
            campusBoundaryPercent.map(point => [...point]);

        deactivateBoundaryEditingMode();

        showStatus("Campus boundary saved successfully!");

    } catch (error) {

        console.error("Could not save campus boundary:", error);

        showStatus(
            "Unable to save boundary. Browser storage may be full."
        );
    }
}

function cancelCampusBoundary() {

    campusBoundaryPercent =
        savedCampusBoundaryPercent.map(point => [...point]);

    deactivateBoundaryEditingMode();

    showStatus("Boundary changes cancelled.");
}

function deactivateBoundaryEditingMode() {

    boundaryEditingMode = false;

    if (boundaryHandleLayer) {
        campusMap.removeLayer(boundaryHandleLayer);
        boundaryHandleLayer = null;
    }

    if (boundaryToolbar) {
        boundaryToolbar.style.display = "none";
    }

    campusMap.dragging.enable();

    campusMap.getContainer().classList.remove(
        "campus-boundary-editing-active"
    );

    drawCampusBoundary();
}


// =============================================
// RENDER WAYPOINT MARKERS
// =============================================

function renderMarkers() {

    if (!markerLayer) return;

    markerLayer.clearLayers();

    campusLocations.forEach(function(location) {

        const x = mapImageWidth * (location.x / 100);
        const y = mapImageHeight * (1 - location.y / 100);

        const markerIcon = L.divIcon({
            className: "campus-marker-icon",
            html: '<div class="map-marker"></div>',
            iconSize: [32, 40],
            iconAnchor: [16, 40]
        });

        const marker = L.marker([y, x], {
            pane: "waypointPane",
            icon: markerIcon,
            interactive: true,
            bubblingMouseEvents: false
        });

        marker.bindTooltip(location.name);

        marker.on("click", function() {

            if (removalMode) {
                openDeleteConfirmation(location);
                return;
            }

            if (editingMode) {
                openEditForm(location);
                return;
            }

            if (positioningMode) {
                showStatus("Finish adding your waypoint first.");
                return;
            }

            showLocation(location);
        });

        markerLayer.addLayer(marker);
    });
}


// =============================================
// LOCATION INFORMATION PANEL
// =============================================

function showLocation(location) {

    selectedLocationId = location.id;

    locationName.textContent = location.name;
    locationDescription.textContent =
        location.description || "";

    locationHours.textContent =
        location.hours || "Opening hours unavailable";

    locationAddress.textContent =
        location.address || "Address unavailable";

    if (location.photo) {

        locationPhoto.src = location.photo;
        locationPhoto.alt = location.name;
        locationPhoto.classList.remove("hidden");

        locationPhoto.onerror = function() {
            locationPhoto.classList.add("hidden");
        };

    } else {

        locationPhoto.removeAttribute("src");
        locationPhoto.classList.add("hidden");
    }

    locationCard.classList.remove("hidden");
    locationCard.classList.remove("collapsed");

    document.getElementById("toggleLocationCard")
        .setAttribute(
            "aria-label",
            "Collapse location information"
        );

    document.getElementById("mascotContainer")
        .classList.add("hidden");
}

function closeLocation() {

    locationCard.classList.add("hidden");
    locationCard.classList.remove("collapsed");

    selectedLocationId = null;

    document.getElementById("mascotContainer")
        .classList.remove("hidden");
}

document.getElementById("toggleLocationCard")
    .addEventListener("click", function() {

        locationCard.classList.toggle("collapsed");

        const collapsed =
            locationCard.classList.contains("collapsed");

        this.setAttribute(
            "aria-label",
            collapsed
                ? "Expand location information"
                : "Collapse location information"
        );
    });


// =============================================
// MODE MANAGEMENT
// =============================================

function clearModes() {

    positioningMode = false;
    editingMode = false;
    removalMode = false;

    if (boundaryEditingMode) {

        campusBoundaryPercent =
            savedCampusBoundaryPercent.map(point => [...point]);

        boundaryEditingMode = false;

        if (boundaryHandleLayer && campusMap) {
            campusMap.removeLayer(boundaryHandleLayer);
            boundaryHandleLayer = null;
        }

        if (boundaryToolbar) {
            boundaryToolbar.style.display = "none";
        }

        if (campusMap) {
            campusMap.dragging.enable();
        }

        drawCampusBoundary();
    }

    pendingCoordinates = null;
    pendingEditLocationId = null;

    if (campusMap) {

        const container = campusMap.getContainer();

        container.classList.remove(
            "waypoint-positioning-active",
            "waypoint-editing-active",
            "waypoint-removal-active"
        );
    }
}


// =============================================
// ADD WAYPOINT MODE
// =============================================

function activatePositioningMode() {

    if (!campusMap) return;

    clearModes();

    positioningMode = true;

    campusMap.getContainer().classList.add(
        "waypoint-positioning-active"
    );

    document.getElementById("menuPanel")
        .classList.remove("active");

    showStatus("Add mode: Click an empty map position.");
}


// =============================================
// EDIT WAYPOINT MODE
// =============================================

function activateEditingMode() {

    if (!campusMap) return;

    clearModes();

    editingMode = true;

    campusMap.getContainer().classList.add(
        "waypoint-editing-active"
    );

    document.getElementById("menuPanel")
        .classList.remove("active");

    closeLocation();

    showStatus(
        "Edit mode: Click the waypoint you want to modify."
    );
}


// =============================================
// OPEN WAYPOINT EDIT FORM
// =============================================

function openEditForm(location) {

    pendingEditLocationId = location.id;

    waypointName.value = location.name || "";
    waypointDescription.value = location.description || "";
    waypointPhoto.value = location.photo || "";
    waypointHours.value = location.hours || "";
    waypointAddress.value = location.address || "";

    document.querySelector(".waypoint-modal-content h3")
        .textContent = "Edit Campus Location";

    document.querySelector("#saveWaypoint")
        .textContent = "Save Changes";

    waypointModal.classList.remove("hidden");

    waypointName.focus();

    showStatus("Editing " + location.name);
}


// =============================================
// REMOVE WAYPOINT MODE
// =============================================

function activateRemovalMode() {

    if (!campusMap) return;

    clearModes();

    removalMode = true;

    campusMap.getContainer().classList.add(
        "waypoint-removal-active"
    );

    document.getElementById("menuPanel")
        .classList.remove("active");

    closeLocation();

    showStatus(
        "Remove mode: Click the waypoint you want to delete."
    );
}


// =============================================
// MAP CLICK FOR ADDING WAYPOINTS
// =============================================

function handleMapClick(event) {

    if (!positioningMode) return;

    if (event.target.closest(".leaflet-control")) return;
    if (event.target.closest(".leaflet-marker-icon")) return;

    const latlng = campusMap.mouseEventToLatLng(event);

    const x = (latlng.lng / mapImageWidth) * 100;

    const y = (
        1 - (latlng.lat / mapImageHeight)
    ) * 100;

    pendingCoordinates = {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2))
    };

    pendingEditLocationId = null;

    waypointName.value = "";
    waypointDescription.value = "";
    waypointPhoto.value = "";
    waypointHours.value = "";
    waypointAddress.value = "";

    document.querySelector(".waypoint-modal-content h3")
        .textContent = "Add Campus Location";

    document.querySelector("#saveWaypoint")
        .textContent = "Save Waypoint";

    waypointModal.classList.remove("hidden");

    waypointName.focus();

    showStatus("Map position selected.");
}


// =============================================
// SAVE ADD OR EDIT WAYPOINT
// =============================================

function createWaypoint() {

    const name = waypointName.value.trim();
    const description = waypointDescription.value.trim();
    const photo = waypointPhoto.value.trim();
    const hours = waypointHours.value.trim();
    const address = waypointAddress.value.trim();

    if (!name) {
        alert("Please enter a building name.");
        waypointName.focus();
        return;
    }

    // EDIT EXISTING WAYPOINT
    if (pendingEditLocationId) {

        const index = campusLocations.findIndex(
            location => location.id === pendingEditLocationId
        );

        if (index === -1) {
            showStatus("Waypoint could not be found.");
            return;
        }

        const previousLocation = {
            ...campusLocations[index]
        };

        campusLocations[index] = {
            ...campusLocations[index],
            name: name,
            description: description,
            photo: photo,
            hours: hours,
            address: address
        };

        if (!saveLocations()) {
            campusLocations[index] = previousLocation;
            return;
        }

        waypointModal.classList.add("hidden");

        clearModes();

        renderMarkers();

        showStatus(name + " updated successfully!");

        return;
    }

    // ADD NEW WAYPOINT
    if (!pendingCoordinates) {
        alert("Please select a map position first.");
        return;
    }

    const baseId = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "location";

    let id = baseId;
    let counter = 2;

    while (campusLocations.some(location => location.id === id)) {
        id = baseId + "-" + counter;
        counter++;
    }

    const newLocation = {
        id: id,
        name: name,
        description: description,
        photo: photo,
        hours: hours,
        address: address,
        x: pendingCoordinates.x,
        y: pendingCoordinates.y
    };

    campusLocations.push(newLocation);

    if (!saveLocations()) {
        campusLocations.pop();
        return;
    }

    waypointModal.classList.add("hidden");

    clearModes();

    renderMarkers();

    showStatus(name + " added successfully!");
}


// =============================================
// CANCEL WAYPOINT FORM
// =============================================

function cancelWaypointForm() {

    waypointModal.classList.add("hidden");

    clearModes();

    document.querySelector(".waypoint-modal-content h3")
        .textContent = "Add Campus Location";

    document.querySelector("#saveWaypoint")
        .textContent = "Save Waypoint";

    showStatus("Waypoint operation cancelled.");
}


// =============================================
// CUSTOM DELETE CONFIRMATION
// =============================================

function openDeleteConfirmation(location) {

    pendingDeleteLocation = location;

    deleteConfirmMessage.textContent =
        "Are you sure you want to delete " +
        location.name + "?";

    deleteConfirmModal.classList.remove("hidden");
}

function closeDeleteConfirmation() {

    deleteConfirmModal.classList.add("hidden");

    pendingDeleteLocation = null;
}

function confirmWaypointDeletion() {

    if (!pendingDeleteLocation) return;

    const location = pendingDeleteLocation;

    const index = campusLocations.findIndex(
        item => item.id === location.id
    );

    if (index === -1) {
        closeDeleteConfirmation();
        return;
    }

    const deletedLocation =
        campusLocations.splice(index, 1)[0];

    if (!saveLocations()) {
        campusLocations.splice(index, 0, deletedLocation);
        return;
    }

    closeDeleteConfirmation();

    clearModes();

    closeLocation();

    renderMarkers();

    showStatus(location.name + " deleted successfully!");
}


// =============================================
// BUTTON LISTENERS
// =============================================

document.getElementById("addWaypointButton")
    .addEventListener("click", activatePositioningMode);

document.getElementById("editWaypointButton")
    .addEventListener("click", activateEditingMode);

document.getElementById("removeWaypointButton")
    .addEventListener("click", activateRemovalMode);

document.getElementById("saveWaypoint")
    .addEventListener("click", createWaypoint);

document.getElementById("cancelWaypoint")
    .addEventListener("click", cancelWaypointForm);

document.getElementById("confirmDelete")
    .addEventListener("click", confirmWaypointDeletion);

document.getElementById("cancelDelete")
    .addEventListener("click", closeDeleteConfirmation);


// =============================================
// START MAP
// =============================================

initializeMap();
