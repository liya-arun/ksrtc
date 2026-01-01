document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Map
    const map = L.map('map').setView([12.9716, 77.5946], 12); // Centered on Bangalore

    // Add a tile layer from OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // 2. Define Custom Bus Icon
    const busIcon = L.icon({
        iconUrl: 'bus-icon.svg',
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -40]
    });

    // 3. Simulated Data
    const routes = {
        'Route-1': {
            path: [
                [12.9716, 77.5946], // Majestic
                [12.9795, 77.5913], // Anand Rao Circle
                [12.9863, 77.5821], // Malleswaram
                [12.9984, 77.5712], // Sadashivanagar
                [13.0094, 77.5517]  // Hebbal
            ],
            color: 'blue'
        },
        'Route-2': {
            path: [
                [12.9293, 77.6245], // Koramangala
                [12.9352, 77.6143], // BTM Layout
                [12.9121, 77.5922], // Jayanagar
                [12.9345, 77.5828], // Basavanagudi
                [12.9515, 77.5752]  // Chamarajpet
            ],
            color: 'red'
        },
        'Route-3': {
            path: [
                [12.9767, 77.6397], // Indiranagar
                [12.9719, 77.6145], // Domlur
                [12.9629, 77.6416], // HAL
                [12.9590, 77.6600], // Marathahalli
                [12.9785, 77.7285]  // Whitefield
            ],
            color: 'green'
        }
    };

    let buses = [];
    const routePolylines = {};

    // 4. Populate Route Selector
    const routeSelect = document.getElementById('route-select');
    routeSelect.innerHTML = '<option value="all">Show All Routes</option>';
    for (const routeName in routes) {
        const option = document.createElement('option');
        option.value = routeName;
        option.textContent = routeName;
        routeSelect.appendChild(option);
    }
    
    // Function to draw route polylines on the map
    function drawRoutes(selectedRoute) {
        // Clear existing polylines
        for (const routeName in routePolylines) {
            map.removeLayer(routePolylines[routeName]);
        }

        const routesToDraw = selectedRoute === 'all' ? Object.keys(routes) : [selectedRoute];

        routesToDraw.forEach(routeName => {
            const route = routes[routeName];
            const polyline = L.polyline(route.path, { color: route.color, weight: 5, opacity: 0.7 }).addTo(map);
            routePolylines[routeName] = polyline;
            if (routesToDraw.length === 1) {
                map.fitBounds(polyline.getBounds().pad(0.1));
            }
        });
    }


    // 5. Bus Simulation
    function initializeBuses() {
        // Clear existing buses
        buses.forEach(bus => map.removeLayer(bus.marker));
        buses = [];

        for (const routeName in routes) {
            const route = routes[routeName];
            const marker = L.marker(route.path[0], { icon: busIcon }).addTo(map);
            marker.bindPopup(`<b>${routeName}</b>`);
            
            buses.push({
                marker: marker,
                routeName: routeName,
                path: route.path,
                segmentIndex: 0,
                progress: 0,
                speed: 0.00005 * (Math.random() * 4 + 1) // Vary speed for realism
            });
        }
    }

    function updateBusPositions() {
        buses.forEach(bus => {
            const currentPoint = bus.path[bus.segmentIndex];
            const nextPoint = bus.path[bus.segmentIndex + 1];

            if (!nextPoint) {
                // End of the route, reset
                bus.segmentIndex = 0;
                bus.progress = 0;
                bus.marker.setLatLng(bus.path[0]);
                return;
            }

            // Calculate new position along the segment
            bus.progress += bus.speed;
            const lat = currentPoint[0] + (nextPoint[0] - currentPoint[0]) * bus.progress;
            const lng = currentPoint[1] + (nextPoint[1] - currentPoint[1]) * bus.progress;
            
            // Calculate rotation
            const angle = Math.atan2(nextPoint[1] - currentPoint[1], nextPoint[0] - currentPoint[0]) * 180 / Math.PI;
            bus.marker.setRotationAngle(angle + 90); // Adjusting because of icon orientation

            bus.marker.setLatLng([lat, lng]);

            // Move to the next segment if completed
            if (bus.progress >= 1) {
                bus.segmentIndex++;
                bus.progress = 0;
            }
        });
    }
    
    // Handle route selection change
    routeSelect.addEventListener('change', (e) => {
        const selectedRoute = e.target.value;
        drawRoutes(selectedRoute);
        
        buses.forEach(bus => {
            if (selectedRoute === 'all' || bus.routeName === selectedRoute) {
                bus.marker.setOpacity(1);
            } else {
                bus.marker.setOpacity(0);
            }
        });

        if (selectedRoute === 'all') {
             map.setView([12.9716, 77.5946], 12);
        }
    });
    
    // Initial setup
    drawRoutes('all');
    initializeBuses();
    setInterval(updateBusPositions, 50); // Update every 50ms for smooth animation
});

// Leaflet plugin for marker rotation
(function () {
    // save these original methods before they are overwritten
    var proto_initIcon = L.Marker.prototype._initIcon;
    var proto_setPos = L.Marker.prototype._setPos;

    var oldIE = (L.DomUtil.TRANSFORM === 'msTransform');

    L.Marker.addInitHook(function () {
        var iconOptions = this.options.icon && this.options.icon.options;
        var iconAnchor = iconOptions && this.options.icon.options.iconAnchor;
        if (iconAnchor) {
            iconAnchor = (iconAnchor[0] + 'px ' + iconAnchor[1] + 'px');
        }
        this.options.rotationOrigin = this.options.rotationOrigin || iconAnchor || 'center bottom' ;
        this.options.rotationAngle = this.options.rotationAngle || 0;

        // Ensure marker keeps rotated during drag
        this.on('drag', function(e) { e.target._applyRotation(); });
    });

    L.Marker.include({
        _initIcon: function() {
            proto_initIcon.call(this);
        },

        _setPos: function (pos) {
            proto_setPos.call(this, pos);
            this._applyRotation();
        },

        _applyRotation: function () {
            if(this.options.rotationAngle) {
                this._icon.style[L.DomUtil.TRANSFORM+'Origin'] = this.options.rotationOrigin;

                if(oldIE) {
                    // for IE 9+, use the 2D rotation
                    this._icon.style[L.DomUtil.TRANSFORM] = 'rotate(' + this.options.rotationAngle + 'deg)';
                } else {
                    // for modern browsers, prefer the 3D accelerated version
                    this._icon.style[L.DomUtil.TRANSFORM] += ' rotateZ(' + this.options.rotationAngle + 'deg)';
                }
            }
        },

        setRotationAngle: function(angle) {
            this.options.rotationAngle = angle;
            this.update();
            return this;
        },

        setRotationOrigin: function(origin) {
            this.options.rotationOrigin = origin;
            this.update();
            return this;
        }
    });
})();