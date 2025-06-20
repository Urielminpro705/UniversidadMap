// const serverUrl = "http://localhost:3000"
const serverUrl = "https://344w4dg1-3000.usw3.devtunnels.ms" // URL del server
const headers_desplegables = document.querySelectorAll(".btn-header"); // Encabezados desplegables
const btns_secciones = document.querySelectorAll(".btn-bar-seccion"); // Botones para cambiar de seccion
const menu_lateral = document.getElementById("cont-bar-lateral"); // Menu latera
const main = document.getElementById("main"); // Contenedor Main
var pantallaActual = document.getElementById("cont-pantalla-inicio"); // Pantalla actual del menu lateral
const capaPoligonos = L.layerGroup(); // Capa para los poligonos
const capaPuntos = L.layerGroup(); // Capa para los puntos
const capaCalles = L.layerGroup(); // Capa para las calles
const capaRutas = L.layerGroup(); // Capa para las rutas
var poligonos = null; // Aqui se almacena el feature collection de las zonas
var puntos =  null; // Aqui se almacena el feature collection de los lugares
var calles = null; // Aqui se almacena el feature collection de las calles
var mapaClick = false; // Define si se puede o no hacer clic sobre el mapa
var listaFiltros = [ // Lista de filtros para las diferentes ubicacion
    "edificio",
    "cancha",
    "administrativo",
    "estacionamiento",
    "natural",
    "tienda",
    "auditorio",
    "monumento",
    "salon",
    "sala de computo",
    "oficina"
];
let pantallaCooldownActivo = false; // Crea un cooldown para los botones de las secciones del menu lateral
var ubicaciones = { // Diccionario con los datos necesarios del origen y del destino
    ubicacion_actual: {
        nombre: "Ubicación Actual",
        pregunta: "¿Esta es tu ubicación actual?",
        id_cont: "cont-ubicacion-origen-seleccionada",
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
        id_cont: "cont-ubicacion-destino-seleccionada",
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
// Icono rojo para los markers
const redIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize:     [25, 41],
    iconAnchor:   [12, 41],
    popupAnchor:  [1, -34],
    shadowSize:   [41, 41]
});
var ubicacionBuscada = ubicaciones["destino"].nombre; // Almacena la ubicacion que se esta buscando actualmente
const limitesCoords = L.latLngBounds(
  [21.15014807520116, -101.71388646513078], // Suroeste
  [21.154566201329885, -101.70916391707974] // Noreste
);

cargarBtnsFiltros();
const checkBoxes = document.querySelectorAll(".filtro"); // Switches de filtros

var filtros = () => {
    var filtros = [];
    checkBoxes.forEach((checkBox) => {
        if (checkBox.checked) {
            filtros.push(checkBox.value);
        }
    })
    console.log(filtros)
    return filtros;
}

function cargarBtnsFiltros () {
    const contenedorFiltros = document.querySelector(".cont-desplegable-filtros");
    listaFiltros.forEach((filtro) => {
        const filtroSwitch = `
            <li>
                <Label for="filtro-${filtro}">${filtro.charAt(0).toUpperCase() + filtro.slice(1)}</Label>
                <input type="checkbox" name="filtro-${filtro}" id="filtro-${filtro}" class="filtro switch" value="${filtro}" checked>
            </li>
        `
        contenedorFiltros.innerHTML += filtroSwitch;
    });
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

// Mapa de leaflet
const map = L.map('map', {
    // maxBounds: limitesCoords,
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

// Capa para el mapa
var capaMapaActual = L.tileLayer(mapas[0].url, {
    attribution: mapas[0].attribution
}).addTo(map);

mostrarBtnsMapas();

function obtenerUbicacionReal() {
    navigator.geolocation.watchPosition(
        position => {
            console.log("Lat:", position.coords.latitude, "Lon:", position.coords.longitude);
            L.marker([position.coords.latitude, position.coords.longitude]).addTo(map)
                .bindPopup("LOL")
                .openPopup();
        },
        error => {
            console.error("Error:", error.message);
            // Ejemplo: "User denied Geolocation"
        }
    );
}

//#region Funciones de Marcadores
// Agrega un marker temporal al mapa
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

// Eliminar marker temporal
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

// Permite convertir un marker temporal en permanente
function agregarMarkerPermanente(nombreUbicacion = ubicacionBuscada, continuarBusqueda = false) {
    const ubicacion = ubicaciones[nombreUbicacion];
    const contUbicacion = document.getElementById(ubicacion.id_cont)

    if (!ubicacion) return;

    if (ubicacion.tag) {
        removerMarkerPermanente(nombreUbicacion = nombreUbicacion);
    }

    if (ubicacion.temp.tag) {
        ubicacion.lat = ubicacion.temp.lat;
        ubicacion.lon = ubicacion.temp.lon;
        if (nombreUbicacion == "ubicacion_actual") {
            ubicacion.tag = L.marker([ubicacion.lat, ubicacion.lon], { icon: redIcon }).addTo(map)
                .bindPopup(ubicacion.nombre)
                .openPopup();
        } else {
            ubicacion.tag = L.marker([ubicacion.lat, ubicacion.lon]).addTo(map)
                .bindPopup(ubicacion.nombre)
                .openPopup();
        }
        removerMarkerTemporal(nombreUbicacion = nombreUbicacion);
    }

    if (!continuarBusqueda) {
        desactivarModoBusqueda(nombreUbicacion = nombreUbicacion);
    }

    agregarCardUbicacionSeleccionada(nombreUbicacion);

    if (sePuedeCalcularRuta()) {
        console.log(
            ubicaciones["ubicacion_actual"].lon, 
            ubicaciones["ubicacion_actual"].lat, 
            ubicaciones["destino"].lon,
            ubicaciones["destino"].lat
        )
        cargarRutas(
            ubicaciones["ubicacion_actual"].lon, 
            ubicaciones["ubicacion_actual"].lat, 
            ubicaciones["destino"].lon,
            ubicaciones["destino"].lat
        )
    }
}

// Buscar una figura dentro de un FeatureCollection por medio de un filtro
function buscarFiguras(fuente, clave, valor) {
    return { 
        type: "FeatureCollection",
        features: fuente.features.filter(f => f.properties[clave] === valor)
    };
}

// Sirve para mostrar una previw de la ubicacion seleccionada como origen o destino
function agregarCardUbicacionSeleccionada(nombreUbicacion, id = null, esPoligono = true) {
    var ubicacion;
    if (id == null) {
        ubicacion = ubicaciones[nombreUbicacion];
    } else {
        ubicacion = buscarFiguras(esPoligono ? poligonos : puntos, "id", id);
    }
    const contUbicacion = document.getElementById(ubicacion.id_cont);
    var card = ``;
    if (id == null) {
        verUbicacionPersonalizada = (lat, lon) => {
            cerrarMenuLateral() 
            setTimeout(function() {
                volarHacia(lat,lon,18)
            }, 150)
        }
        card = `
            <img src="https://pixsector.com/cache/c5433603/av741f3e5fd1c88304cf8.png" alt="" class="cont-ubicacion-card-seleccionada-img">
            <div class="cont-ubicacion-card-seleccionada-info-cont">
                <p class="cont-ubicacion-card-seleccionada-nombre">Ubicacion personalizada</p>
                <button class="btn-3d" onclick="verUbicacionPersonalizada(${ubicacion.lat},${ubicacion.lon})">Ver Ubicación</button>
            </div>
        `;
    } else {
        card = `
            <img src="${ubicacion.properties.imagen}">
            <div class="cont-ubicacion-card-seleccionada-info-cont">
                <p class="cont-ubicacion-card-seleccionada-nombre">${ubicacion.properties.nombre}</p>
                <button class="btn-3d" onclick=mostrarDetallesLugar(${id},${esPoligono})>Ver Ubicación</button>
            </div>
        `;
    }
    
    contUbicacion.innerHTML = card;
}

// Comprueba si se puede calcular una ruta
function sePuedeCalcularRuta () {
    return ubicaciones["destino"].tag && ubicaciones["ubicacion_actual"].tag;
}

// Elimina un marcador permanente
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

// Abre el menu inferior
function abrirMenuInferior(content) {
    const contenedor = document.querySelector(".cont-menu-inferior");
    contenedor.hidden = false;
    contenedor.innerHTML = content;
    setTimeout(function () {
        contenedor.classList.add("cont-menu-inferior-activo");
    }, 100)
}

// Cierra el menu inferior
function cerrarMenuInferior() {
    const contenedor = document.querySelector(".cont-menu-inferior");
    contenedor.classList.remove("cont-menu-inferior-activo");
    const duracionMs = obtenerTiempoAnimacion(contenedor);
    setTimeout(function () {
        contenedor.hidden = true;
        contenedor.innerHTML = "";
    }, duracionMs)
}

// Activa el modo busqueda
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

// Desactiva el modo busqueda
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

// Agregar el evento change a los checkboxes de filtro
checkBoxes.forEach((checkBox) => {
    checkBox.addEventListener("change", () => {
        dibujarPuntosPoligonos(poligonos, capaPoligonos);
        dibujarPuntosPoligonos(puntos, capaPuntos);
        mostrarCardUbicaciones(true);
        mostrarCardUbicaciones();
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

// Cerrar el menu lateral
function cerrarMenuLateral() {
    eliminarClase("btn-bar-seccion-active");
    main.classList.add("con-bar-lateral-closed");
    setTimeout(() => {
        map.invalidateSize({pan: false});
        map.panTo([21.1523, -101.7115], {animate: true});
    }, 150);
}

// Abrir el menu lateral
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
            map.invalidateSize({pan: false});
            if (event) map.panTo([21.1523, -101.7115], {animate: true});
        }, 150);
    }
    
    const pantallaSiguiente = document.getElementById(idPantalla);
    if (pantallaSiguiente != pantallaActual) {
        cambiarPantalla(idPantalla);
    }
}

// Navegar por las pantallas
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

// Se encarga de dibujar los puntos y los poligonos
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
                case "edificio": color = "#0B7189"; break;
                case "cancha": color = "orange"; break;
                case "administrativo": color = "#DB504A"; break;
                case "estacionamiento": color = "#B4B8C5"; break;
                case "natural": color = "#1fb471a5";break;
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

            let color = "";
            switch (feature.properties.tipo) {
                case "tienda": color = "#F4A261"; break;
                case "auditorio": color = "#2A9D8F"; break;
                case "monumento": color = "#E76F51"; break;
                case "salon": color = "#264653"; break;
                case "sala de computo": color = "#457B9D"; break;
                case "oficina": color = "#8D99AE"; break;
                default: color = "#BDBDBD";break;
            }

            return L.circleMarker(latlng, {
                radius: 6,
                color: color,
                fillColor: color,
                fillOpacity: 1} );
        },

        onEachFeature: (feature, layer) => {
            layer.bindPopup(String(feature.properties.nombre));
            layer.on("click", function(e) {
                const figura = e.target.feature;
                if (figura.geometry.type == "Polygon" || figura.geometry.type == "MultiPolygon") {
                    mostrarDetallesLugar(e.target.feature.properties.id);
                } else {
                    mostrarDetallesLugar(e.target.feature.properties.id, false);
                }
            });
            capa.addLayer(layer);
        }
    });
    if (!map.hasLayer(capa)) {
        capa.addTo(map);
    }
}

// Dibuja lineas
function dibujarLineas(data, capa, weight = 3, color = "#E6E8E6") {
    capa.clearLayers();
    capaActual = L.geoJSON(data, {
        style: {color: color,weight: weight}
    });
    capa.addLayer(capaActual);
    if (!map.hasLayer(capa)) {
        capa.addTo(map);
    }
}

// Encuentra una figura en una capa
function buscarCapaDeFigura (id, esPoligono = true) {
    let encontrada = null;
    if(esPoligono) {
        capaPoligonos.eachLayer(layer => {
            if(layer.feature?.properties?.id == id) {
                encontrada = layer
            }
        });
    } else {
        capaPuntos.eachLayer(layer => {
            if(layer.feature?.properties?.id == id) {
                encontrada = layer
            }
        });
    }
    return encontrada;
}

// Busca los puntos de acceso mas cercanos a una ubicacion
function buscarAccesoMasCercano(nombreUbicacion = "ubicacion_actual", idZona) {
    const ubicacion = ubicaciones[nombreUbicacion];
    const todosLosLugares = buscarFiguras(puntos, "zona", idZona);
    const lugares = buscarFiguras(todosLosLugares, "tipo", "acceso");
    var distanciaMasCorta = 10000;
    var accesoMasCercano = 10000;
    const origen = point([ubicacion.lon, ubicacion.lat]);
    lugares.forEach((lugar) => {
        const destino = point(lugar.feature.geometry.coordinates);
        const distancia = distance(origen, destino, { units: "meters" })
        if (distancia < distanciaMasCorta) {
            distanciaMasCorta = distancia;
            accesoMasCercano = lugar;
        }
    });
    return accesoMasCercano;
}

// Busca los accesos de una zona
function obtenerAccesos(id) {
    console.log(puntos)
    const lugares = buscarFiguras(puntos, "zona", id);
    console.log(lugares)
    return accesos = buscarFiguras(lugares, "tipo", "acceso");
}

// Permite agregar una ubicacion vinculada a una ubicacion real
function agregarUbicacionDirecta(nombreUbicacion, id, esPoligono) {
    const agregarUbicacionPoligono = (id) => {
        const accesos = obtenerAccesos(id);
        var acceso;
        if (accesos.features.length === 0) {
            const zona = buscarFiguras(poligonos, "id", id)
            acceso = turf.centroid(zona.features[0].geometry); 
        } else {
            acceso = accesos.features[0];
        }
        agregarMarkerTemporal(acceso.geometry.coordinates[1], acceso.geometry.coordinates[0], nombreUbicacion);
        agregarMarkerPermanente(nombreUbicacion);
    }
    
    if (esPoligono) {
        agregarUbicacionPoligono(id)
    } else {
        const lugares = buscarFiguras(puntos, "id", id);
        const lugar = lugares.features[0]
        console.log(lugar)
        if (lugar.properties.zona != 0) {
            agregarUbicacionPoligono(lugar.properties.zona);
        } else {
            agregarMarkerTemporal(lugar.geometry.coordinates[1], lugar.geometry.coordinates[0], nombreUbicacion);
            agregarMarkerPermanente(nombreUbicacion);
        }
    }
}

// Se encarga de mostrar los detalles de un lugar o zona en la pantalla de detalles
function mostrarDetallesLugar(id, esPoligono = true) {
    var figura;
    var zona;
    const capa = buscarCapaDeFigura(id, esPoligono);
    capa.openPopup();
    if (esPoligono) {
        figura = poligonos.features.find(f => f.properties.id === id);
    } else {
        figura = puntos.features.find(f => f.properties.id === id);
        zona = buscarFiguras(poligonos, "id", figura.properties.zona);
    }
    const centroide = turf.centroid(figura.geometry); 
    const [lng, lat] = centroide.geometry.coordinates;
    const contDetalles = document.getElementById("body-detail");
    var distancia = 0;
    if (ubicaciones.ubicacion_actual.tag) {
        const origen = turf.point([ubicaciones.ubicacion_actual.lon, ubicaciones.ubicacion_actual.lat]);

        let destinoCoords;

        if (esPoligono) {
        const centroide = turf.centroid(figura);  // pasa la Feature completa
        destinoCoords = centroide.geometry.coordinates;
        } else {
        destinoCoords = figura.geometry.coordinates;
        }

        const destino = turf.point(destinoCoords);

        distancia = turf.distance(origen, destino, { units: "meters" });
    }
    var pagina = `
        <div id="img-detail"></div>
        <h3 id="title-detail">${figura.properties.nombre}</h3>
        <p class="sub-detail"><i class="fa-solid fa-map-location-dot"></i> A <span id="m-detail">${distancia.toFixed(2)}</span> Metros</p>        
        <div class="cont-btns-detail">
            <button class="btn-3d btn-detail" onclick="agregarUbicacionDirecta('ubicacion_actual',${figura.properties.id},${esPoligono})">Usar como origen</button>
            <button class="btn-3d btn-detail" onclick="agregarUbicacionDirecta('destino',${figura.properties.id},${esPoligono})">Usar como destino</button>
        </div>
        <p class="card-location-title">ID</p>
        <p class="card-location-sub">${figura.properties.id}</p>
        <p class="card-location-title">Tipo</p>
        <p class="card-location-sub">${figura.properties.tipo}</p>
        `;
    const variableLugar = !esPoligono ? `
        <p class="card-location-title">Piso</p>
        <p class="card-location-sub">${figura.properties.piso}</p>
        <p class="card-location-title">Zona</p>
        <p class="card-location-sub">${zona.features[0].properties.nombre}</p>
    ` : ``;

    const variableZona = `
        <p class="card-location-title">Pisos</p>
        <p class="card-location-sub">${figura.properties.pisos}</p>
    `

    pagina += esPoligono ? variableZona : variableLugar;
    contDetalles.innerHTML = pagina;
    const imgDetail = document.getElementById("img-detail");
    imgDetail.style.backgroundImage = `url('${figura.properties.imagen}')`;

    abrirMenuLateral(undefined, "cont-pantalla-detalles");
    setTimeout(function () {
        volarHacia(lat, lng);
    },170);
}

function cargarPoligonos() {
    fetch(`${serverUrl}/zonas`)
    .then(res => res.json())
    .then(data => {
        poligonos = data;
        dibujarPuntosPoligonos(data, capaPoligonos)
        mostrarCardUbicaciones();
    });
}

function cargarRutas(lonOrigen, latOrigen, lonDestino, latDestino) {
    const url = `${serverUrl}/ruta-personalizada?lon_origen=${lonOrigen}&lat_origen=${latOrigen}&lon_destino=${lonDestino}&lat_destino=${latDestino}`;
    fetch(url)
    .then(res => res.json())
    .then(data => {
        dibujarLineas(data, capaRutas, 4, "#004CFF");
    });
}

function cargarLugares() {
    fetch(`${serverUrl}/lugares`)
    .then(res => res.json())
    .then(data => {
        puntos = data;
        console.log(data)
        dibujarPuntosPoligonos(data, capaPuntos);
        mostrarCardUbicaciones(false);
    });
}

function cargarCalles() {
    fetch(`${serverUrl}/calles`)
    .then(res => res.json())
    .then(data => {
        calles = data;
        dibujarLineas(calles, capaCalles, 2);
    })
}

cargarLugares();
cargarPoligonos();
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

// Muestra la lista de ubicaciones que hay
function mostrarCardUbicaciones(esPoligono = true) {
    var figuras = esPoligono ? poligonos : puntos;
    const contUbicaciones = document.getElementById(esPoligono ? "cont-ubicaciones" : "cont-ubicaciones-lugares");
    const grupos = agruparFigurasPorTipo(figuras, filtros());

    // Limpir tarjetas
    contUbicaciones.innerHTML = '';

    // Crear un contenedor por cada tipo
    Object.entries(grupos).forEach(([tipo, features]) => {
        const contenedor = `
            <p class="local-main-title">${tipo.charAt(0).toUpperCase() + tipo.slice(1)}</p>
            <div id="cont-locations-${tipo}" class="cont-contenido">
                <!-- Aqui van card locations -->
                </button>
            </div>
        `;
        contUbicaciones.innerHTML += contenedor;
        const contCards = document.getElementById(`cont-locations-${tipo}`);

        // Agregar las cards de ubicaciones
        features.forEach((figura) => {
            const card = `
                <button class="card-ubicacion" onclick="mostrarDetallesLugar(${figura.properties.id}, ${esPoligono})">
                    <div id="ubicacion-img-${figura.properties.id}" class="ubicacion-img"></div>
                    <div class="card-ubicacion-cont-info">
                        <p class="card-ubicacion-titulo">${figura.properties.nombre}</p>
                        <p class="card-ubicacion-tipo">${tipo}</p>
                    </div>
                </button>
            `;
            contCards.innerHTML += card;
            const img = document.getElementById(`ubicacion-img-${figura.properties.id}`);
            img.style.backgroundImage = `url('${figura.properties.imagen}')`;
        });
    });
}

// Dividir las figuras por grupos basados en el tipo
function agruparFigurasPorTipo(figuras, filtrosActivos = filtros()) {
    const grupos = figuras.features
        .filter(feature => filtrosActivos.includes(feature.properties.tipo))
        .reduce((acc, feature) => {
        const clave = feature.properties.tipo;
        if (!acc[clave]) {
            acc[clave] = [];
        }
        acc[clave].push(feature);
        return acc;
    }, {});

    return grupos;
}

//#endregion