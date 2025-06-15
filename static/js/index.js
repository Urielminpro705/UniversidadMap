const headers_desplegables = document.querySelectorAll(".btn-header");
const btns_secciones = document.querySelectorAll(".btn-bar-seccion");
const menu_lateral = document.getElementById("cont-bar-lateral");
const main = document.getElementById("main");
var pantallaActual = document.getElementById("cont-pantalla-inicio");
const checkBoxes = document.querySelectorAll(".filtro");
const capaPoligonos = L.layerGroup();
const capaPuntos = L.layerGroup();
const capaCalles = L.layerGroup();
var poligonos = null;
var puntos =  null;
var calles = null;
var mapaClick = false;
var listPuntos = [];
var listPolys = [];
let pantallaCooldownActivo = false;
var ubicaciones = {
    ubicacion_actual: {
        nombre: "Ubicación Actual",
        pregunta: "¿Esta es tu ubicación actual?",
        lat: null,
        lon: null,
        tag: null,
        temp: {
            lat: null,
            lon: null,
            tag: null,
        }
    },
    destino: {
        nombre: "Destino",
        pregunta: "¿Este es el destino correcto?",
        lat: null,
        lon: null,
        tag: null,
        temp: {
            lat: null,
            lon: null,
            tag: null,
        }
    }
}
var ubicacionBuscada = ubicaciones["destino"].nombre;
const limitesCoords = L.latLngBounds(
  [21.15014807520116, -101.71388646513078], // Suroeste
  [21.154566201329885, -101.70916391707974] // Noreste
);

var filtros = () => {
    var filtros = [];
    checkBoxes.forEach((checkBox) => {
        if (checkBox.checked) {
            filtros.push(checkBox.value);
        }
    })
    return filtros;
}

// Lista de plantillas de mapas
const mapas = [
    {
        nombre: "normal",
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: null
    },
    {
        nombre: "limpio",
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        attribution: "&copy; OpenStreetMap & CartoDB"
    },
    {
        nombre: "satelital",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: "Tiles © Esri"
    },
    {
        nombre: "voyager",
        url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }
]

const map = L.map('map', {
    maxBounds: limitesCoords,
    center: [21.1523, -101.7115], // Punto aproximado al centro
    zoom: 17,
    minZoom: 17,
    subdomains: 'abcd',
    maxBoundsViscosity: 1.0,
});

map.on("click", function(e) {
    if (!mapaClick) return;
    var lat = e.latlng.lat;
    var lng = e.latlng.lng;
    agregarMarkerTemporal(lat, lng);
});

var capaMapaActual = L.tileLayer(mapas[0].url, {
    attribution: mapas[0].attribution
}).addTo(map);

mostrarBtnsMapas();

//#region Funciones de Marcadores
function agregarMarkerTemporal(lat, lon, nombreUbicacion = ubicacionBuscada) {
    const ubicacion = ubicaciones[nombreUbicacion];
    if (!ubicacion) return;
    if (ubicacion.temp.tag) {
        removerMarkerTemporal();
    }
    const contenedor = `
        <div class="cont-marker-temporal">
            <p class="text-marker-temporal">${ubicacion.pregunta}</p>
            <div class="cont-marker-temporal-btns">
                <button class="btn-marker btn-3d" onclick="agregarMarkerPermanente(nombreUbicacion='${nombreUbicacion}')">Aceptar</button>
                <button class="btn-marker btn-3d" onclick="removerMarkerTemporal(nombreUbicacion='${nombreUbicacion}')">Cancelar</button>
            </div>
        </div>
    `
    ubicacion.temp.lat = lat;
    ubicacion.temp.lon = lon;
    ubicacion.temp.tag =  L.marker([lat, lon]).addTo(map)
        .bindPopup(contenedor)
        .openPopup();
}

function removerMarkerTemporal(nombreUbicacion = ubicacionBuscada) {
    const ubicacion = ubicaciones[nombreUbicacion];
    if (!ubicacion) return;
    if (ubicacion.temp.tag) {
        map.removeLayer(ubicacion.temp.tag);
        ubicacion.temp.tag = null;
        ubicacion.temp.lat = null;
        ubicacion.temp.lon = null;
    }
}

function agregarMarkerPermanente(nombreUbicacion = ubicacionBuscada, continuarBusqueda = false) {
    const ubicacion = ubicaciones[nombreUbicacion];
    if (!ubicacion) return;
    if (ubicacion.tag) {
        removerMarkerPermanente(nombreUbicacion = nombreUbicacion);
    }
    if (ubicacion.temp.tag) {
        ubicacion.lat = ubicacion.temp.lat;
        ubicacion.lon = ubicacion.temp.lon;
        ubicacion.tag = L.marker([ubicacion.lat, ubicacion.lon]).addTo(map)
            .bindPopup(ubicacion.nombre)
            .openPopup();
        removerMarkerTemporal(nombreUbicacion = nombreUbicacion);
    }
    if (!continuarBusqueda) {
        desactivarModoBusqueda(nombreUbicacion = nombreUbicacion);
    }
}

function removerMarkerPermanente(nombreUbicacion = ubicacionBuscada) {
    const ubicacion = ubicaciones[nombreUbicacion];
    if (!ubicacion) return;
    if (ubicacion.tag) {
        map.removeLayer(ubicacion.tag);
        ubicacion.tag = null;
        ubicacion.lat = null;
        ubicacion.lon = null;
    }
}

//#endregion

function abrirMenuInferior(content) {
    const contenedor = document.querySelector(".cont-menu-inferior");
    contenedor.hidden = false;
    contenedor.innerHTML = content;
    setTimeout(function () {
        contenedor.classList.add("cont-menu-inferior-activo");
    }, 100)
}

function cerrarMenuInferior() {
    const contenedor = document.querySelector(".cont-menu-inferior");
    contenedor.classList.remove("cont-menu-inferior-activo");
    const duracionMs = obtenerTiempoAnimacion(contenedor);
    setTimeout(function () {
        contenedor.hidden = true;
        contenedor.innerHTML = "";
    }, duracionMs)
}

function activarModoBusqueda(nombreUbicacion = "destino") {
    ubicacionBuscada = nombreUbicacion;
    map.zoomIn(17);
    const menuInferior = `
        <div class="cont-menu-inferior-contenido cont-menu-inferior-contenido-seleccionar-ubicacion">
            <p class="txt-menu-inferior">
                <i class="fa-solid fa-location-dot"></i>
                Presiona la ubicación en el mapa
            </p>
            <button class="cont-menu-inferior-btn btn-3d" onclick="desactivarModoBusqueda('${nombreUbicacion}')">
                Salir del modo de búsqueda
            </button>
        </div>
    `
    abrirMenuInferior(menuInferior);
    mapaClick = true;
    cerrarMenuLateral();
}

function desactivarModoBusqueda(nombreUbicacion = "destino") {
    mapaClick = false;
    map.zoomOut(17);
    cerrarMenuInferior();
    removerMarkerTemporal(nombreUbicacion = nombreUbicacion);
    abrirMenuLateral(undefined, pantallaActual.id);
}

function mostrarBtnsMapas() {
    const contenedor = document.querySelector(".cont-vistas-mapa");
    mapas.forEach((mapa, indice) => {
        if (indice == 0) {
            btn = `
                <button class="btn-vista-mapa btn-3d btn-vista-mapa-selected" data-id="${mapa.nombre}" onclick="cambiarMapa(event, '${mapa.nombre}')">
                    ${mapa.nombre.charAt(0).toUpperCase() + mapa.nombre.slice(1)}
                </button>
            `;
        } else {
            btn = `
                <button class="btn-vista-mapa btn-3d" data-id="${mapa.nombre}" onclick="cambiarMapa(event, '${mapa.nombre}')">
                    ${mapa.nombre.charAt(0).toUpperCase() + mapa.nombre.slice(1)}
                </button>
            `;
        }
        contenedor.innerHTML += btn;
    });
}

function cambiarMapa(event, nombre){
    const mapaInfo = mapas.find(mapa => mapa.nombre == nombre);
    map.removeLayer(capaMapaActual);
    eliminarClase("btn-vista-mapa-selected");
    event.target.classList.toggle("btn-vista-mapa-selected");
    capaMapaActual = L.tileLayer(mapaInfo.url, {
        attribution: mapaInfo.attribution
    }).addTo(map);
}

function eliminarClase(clase) {
    document.querySelectorAll("." + clase).forEach((elemento) => {
        elemento.classList.remove(clase);
    });
}

checkBoxes.forEach((checkBox) => {
    checkBox.addEventListener("change", () => {
        dibujarPuntosPoligonos(poligonos, capaPoligonos);
        dibujarPuntosPoligonos(puntos, capaPuntos);
        loadLocations(puntos, poligonos)
    });
});

headers_desplegables.forEach((header) => {
    header.addEventListener("click", function() {
        toggleCont(header);
        const hasArrow = header.getAttribute("data-hasarrow") === "true" ? true : false;
        if (hasArrow) {
            const icono = header.querySelector("i");
            icono.style.transform = icono.style.transform === "rotate(180deg)" ? "rotate(0deg)" : "rotate(180deg)";
        }
    });
});

function volarHacia(lat, lng, zoom=18){
    map.flyTo([lat, lng], zoom);
}

function toggleCont(header) {
    const cont_info = header.parentElement.querySelector(".cont-desplegable-info");
    const altura = cont_info.scrollHeight;
    const isOpened = cont_info.getAttribute("data-isopened") === "true" ? true : false;

    if (isOpened) {
        console.log(altura);
        cont_info.style.height = altura + "px";
        setTimeout(function () {
            cont_info.style.height = "0px";
        }, 10);
        cont_info.setAttribute("data-isopened", false);
    } else {
        console.log(altura);
        cont_info.style.height = altura + "px";
        const duracionMs = obtenerTiempoAnimacion(cont_info);
        setTimeout(function () {
            cont_info.style.height = "auto";
        }, duracionMs);
        cont_info.setAttribute("data-isopened", true);
    }
}

function obtenerTiempoAnimacion(componente) {
    const estilos = getComputedStyle(componente);
    const duraciones = estilos.transitionDuration.split(',').map(d => d.trim());
    const duracion = duraciones[0];
    var duracionMs = 3000;
    if (duracion.includes('ms')) {
        duracionMs = parseFloat(duracion);
    } else if (duracion.includes('s')) {
        duracionMs = parseFloat(duracion) * 1000;
    }

    return duracionMs;
}

function cerrarMenuLateral() {
    eliminarClase("btn-bar-seccion-active");
    main.classList.add("con-bar-lateral-closed");
    setTimeout(() => {
        map.invalidateSize();
    }, 200);
}

function abrirMenuLateral(event = null, idPantalla = null) {
    let btn = null;

    if (!event) {
        btns_secciones.forEach((boton) => {
            if (boton.getAttribute("data-id") == idPantalla) {
                btn = boton;
            }
        });
    } else {
        btn = event.target.closest("button");
        if (!idPantalla) {
            idPantalla = btn?.getAttribute("data-id");
        }
    }

    if (pantallaCooldownActivo) return

    eliminarClase("btn-bar-seccion-active");
    btn.classList.add("btn-bar-seccion-active");
    
    if (main.classList.contains("con-bar-lateral-closed")) {
        main.classList.remove("con-bar-lateral-closed");
        setTimeout(() => {
            map.invalidateSize();
        }, 200);
    }
    
    const pantallaSiguiente = document.getElementById(idPantalla);
    if (pantallaSiguiente != pantallaActual) {
        cambiarPantalla(idPantalla);
    }
}

function cambiarPantalla(pantallaSiguienteID) {
    if (pantallaCooldownActivo) return;

    pantallaCooldownActivo = true;

    const pantallaSiguiente = document.getElementById(pantallaSiguienteID)
    pantallaSiguiente.hidden = false;

    btns_secciones.forEach((btn) => {
        if (btn.getAttribute("data-id") == pantallaSiguienteID) {
            eliminarClase("btn-bar-seccion-active");
            btn.classList.add("btn-bar-seccion-active");
            main.classList.remove("con-bar-lateral-closed");
        }
    });

    setTimeout(function () {
        pantallaSiguiente.style.right = "0px";
        pantallaSiguiente.style.zIndex = 3;
    },10);
    const duracionMs = obtenerTiempoAnimacion(pantallaSiguiente);
    setTimeout(function () {
        pantallaSiguiente.classList.add("cont-bar-display-active");
        pantallaActual.hidden = true;
        pantallaActual.classList.remove("cont-bar-display-active");
        pantallaActual = pantallaSiguiente;
        pantallaActual.style.removeProperty("right");
        pantallaActual.style.removeProperty("z-index");

        pantallaCooldownActivo = false;
    },duracionMs);
}


function dibujarPuntosPoligonos(data, capa) {
    capa.clearLayers();
    const filtrosActivos = filtros();

    L.geoJSON(data, {
        filter: function (feature) {
            return filtrosActivos.includes(feature.properties.tipo);
        },
        style: function (feature) {
            let color = "#3388ff";

            switch (feature.properties.tipo) {
                case "zona_natural":
                    color = "#1fb471a5";
                    break;
                case "zona_turistica":
                    color = "#00eaffb3";
                    break;
            }

            return {
                color: color,
                fillColor: color,
                weight: 2,
                opacity: 1,
                fillOpacity: 0.6
            };
        },

        pointToLayer: (feature, latlng) =>{

            let url = "";

            switch(feature.properties.tipo) {
                case "zona_natural": url = "https://cdn-icons-png.flaticon.com/512/472/472521.png"; break;
                case "atraccion" : url = "https://cdn-icons-png.flaticon.com/512/1313/1313129.png"; break;
                case "hotel" : url = "https://cdn-icons-png.flaticon.com/512/1889/1889519.png"; break;
                case "centro_info" : url = "https://cdn-icons-png.flaticon.com/512/4010/4010565.png"; break;
                case "restaurante" : url = "https://cdn-icons-png.flaticon.com/512/1589/1589709.png"; break;
                case "zona_turistica" : url = "https://cdn-icons-png.flaticon.com/512/7205/7205797.png"; break;
                default: url = "https://cdn-icons-png.flaticon.com/512/7708/7708571.png"; break;
            
            }

            const iconoPersonalizado = L.icon({
                iconUrl: url,
                iconSize: [40, 40], 
                iconAnchor: [16, 32], 
                popupAnchor: [0, -32] 
            });

            return L.marker(latlng, { icon: iconoPersonalizado });
        },

        onEachFeature: (feature, layer) => {
            layer.bindPopup(feature.properties.nombre);
            capa.addLayer(layer);
        }
    });
    if (!map.hasLayer(capa)) {
        capa.addTo(map);
    }
}

function cargarPoligonos() {
    fetch('http://localhost:3000/poligonos')
    .then(res => res.json())
    .then(data => {
        poligonos = data;
        loadLocations(puntos, poligonos)
        dibujarPuntosPoligonos(data, capaPoligonos)
    });
}

function cargarPuntos() {
    fetch('http://localhost:3000/puntos')
    .then(res => res.json())
    .then(data => {
        puntos = data;
        loadLocations(puntos, poligonos)
        dibujarPuntosPoligonos(data, capaPuntos)
    });
}

function cargarCalles() {
    fetch(`http://localhost:3000/calles`)
    .then(res => res.json())
    .then(data => {
        calles = data;
        // if (capaCalles) map.removeLayer(capaCalles);
        capa = L.geoJSON(data, {
            style: { color:"red", weight:2 },
        })
        capaCalles.addLayer(capa);
    })
    map.addLayer(capaCalles);
}

cargarPoligonos();
cargarPuntos();
cargarCalles();

async function convertirDireccion(direccion) {
    if (direccion) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.length > 0) {
                return data;
            } else {
                return null
            }
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    }
}

function buscarUbicacion() {
    console.log("UWU");
}

document.getElementById("btn-busqueda").addEventListener("click", function() {
    buscarUbicacion();
});

document.getElementById("barra-busqueda").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        buscarUbicacion();
    }
});

//#region CARGAR Card-Locations

function loadLocations(puntos, polys, id = '#cont-locations'){
    console.log("Se cargan los load locations");

    if(puntos == null || polys == null){
        return;
    }

    listPuntos = puntos.features.map(point => {
        console.log("se agrego el id: "+point.id)
        const [lng, lat] = point.geometry.coordinates;
        return{
            ...point.properties,
            lat,
            lng,
            type: "point",
            distance: calcularDistancia(lat, lng)
        }
    });

    listPolys = polys.features.map(point => {
        const centroide = turf.centroid(point) 
        const [lng, lat] = centroide.geometry.coordinates;
        return{
            ...point.properties,
            lat,
            lng,
            type: "poly",
            distance: calcularDistancia(lat, lng)
        }
    });

    console.log("||| PUNTOS:")
    console.log(listPuntos)
    const container = document.querySelector(id);
    let htmlContent = "";
    const filters = filtros();

    container.innerHTML = "";

    for (let c = 0; c < listPuntos.length; c++) {

        const type = listPuntos[c].tipo;
        const descr = (listPuntos[c].descripcion.length > 40) ? listPuntos[c].descripcion.slice(0, 40)+"..." : listPuntos[c].descripcion;
        const display = (filters.includes(type)) ? '' : 'style="display:none;"';

        htmlContent += `
            <div class="card-location" data-id="${listPuntos[c].id}" ${display} data-lat="${listPuntos[c].lat}" data-lng="${listPuntos[c].lng}" data-type="${listPuntos[c].type}">
                <div class="card-location-img" style="background-image:url(${listPuntos[c].imagen})"></div>
                <div class="card-location-top">
                    <p>${listPuntos[c].tipo}</p>
                    <p><i class="fa-solid fa-map-location-dot"></i> A ${listPuntos[c].distance} km</p>
                </div>
                <p class="card-location-title">${listPuntos[c].nombre}</p>
                <p class="card-location-sub">${descr}</p>
            </div>`;    
    }

    for (let c = 0; c < listPolys.length; c++) {

        const type = listPolys[c].tipo;
        const descr = (listPolys[c].descripcion.length > 40) ? listPolys[c].descripcion.slice(0, 40)+"..." : listPolys[c].descripcion;
        const display = (filters.includes(type)) ? '' : 'style="display:none;"';

        htmlContent += `
            <div class="card-location" data-id="${listPolys[c].id}" ${display} data-lat="${listPolys[c].lat}" data-lng="${listPolys[c].lng}" data-type="${listPolys[c].type}">
                <div class="card-location-img" style="background-image:url(${listPolys[c].imagen})"></div>
                <div class="card-location-top">
                    <p>${listPolys[c].tipo}</p>
                    <p><i class="fa-solid fa-map-location-dot"></i> A ${listPolys[c].distance} km</p>
                </div>
                <p class="card-location-title">${listPolys[c].nombre}</p>
                <p class="card-location-sub">${descr}</p>
            </div>`;    
    }

    container.innerHTML += htmlContent;
}

//#endregion

//#region TODO Locacion Detail

function detectarClickCardUbicacion(event) {
    const card = event.target.closest(".card-location");
    if (card) {
        const id = card.getAttribute('data-id')
        const lng = card.getAttribute('data-lng')
        const lat = card.getAttribute('data-lat')
        const type = card.getAttribute('data-type')
        console.log("se mueve a pantalla detalles: "+id);
        cambiarPantalla("cont-pantalla-detalles");
        volarHacia(lat, lng);
        updateDetail(id, type)
    }
}

document.getElementById("cont-locations").addEventListener("click", function(event) {
    detectarClickCardUbicacion(event);
});

document.querySelector(".cont-desplegable-ubicaciones-cercanas").addEventListener("click", function(event) {
    detectarClickCardUbicacion(event);
});

function updateDetail(id, type){
    const objList = (type == "poly") ? listPolys : listPuntos;
    const punto = objList.find(punt => punt.id == id);
    const contImg = document.querySelector('#img-detail'); 
    contImg.style.backgroundImage = `url('${punto.imagen}')`;
    contImg.innerHTML = "";
    document.querySelector('#title-detail').textContent = punto.nombre;
    document.querySelector('#text-detail').textContent = punto.descripcion;
    document.querySelector('#m-detail').textContent = punto.distance;

    const props = (type == "poly") ? {Acceso: punto.acceso} : {Telefono: punto.telefono, Horario: punto.horario};
    const contProps = document.querySelector('#props-detail');
    contProps.innerHTML = "";
    
    for (let key in props) {
        const valor = props[key];
        contProps.innerHTML += `
            <p class="sub-title-detail">${key}:</p>
            <p class="sub-detail">${valor}</p>
        `;
    }

}

//#endregion

function encontrarVecinos(distancia) {
    if (ubicacion_actual) {        
        const puntoBase = turf.point([ubicacion_actual.lon, ubicacion_actual.lat]);
        const buffer = turf.buffer(puntoBase, distancia, { units: 'kilometers' });

        const vecinosPuntos = puntos.features.filter(p => 
            turf.booleanPointInPolygon(p, buffer)
        );

        const vecinosPoligonos = poligonos.features.filter(poly => {
            const tipo = poly.geometry.type;
            return tipo === "Polygon" || tipo === "MultiPolygon" ? turf.booleanIntersects(poly, buffer) : false;
        });

        return {
            puntosVecinos: {
                type: "FeatureCollection",
                features: vecinosPuntos
            },
            poligonosVecinos: {
                type: "FeatureCollection",
                features: vecinosPoligonos
            }
        }
    }
}