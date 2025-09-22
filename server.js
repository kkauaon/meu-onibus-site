require('dotenv').config()

const express = require("express");
const path = require("path");
const browserify = require("browserify");
const babelify = require("babelify");
const fetch = require('node-fetch');
const fs = require('fs')

const app = express();

app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

const TILE_CACHE_DIR = path.join(__dirname, 'tile_cache');
if (!fs.existsSync(TILE_CACHE_DIR)) fs.mkdirSync(TILE_CACHE_DIR);

const paradas = [
    { 
        id: 106054, 
        nome: "IFCE 60",     
        "latLng": {
            "lat": -3.7438030737517027,
            "lng": -38.53569420090844
        } 
    },
    { 
        id: 106113, 
        nome: "IFCE 7416",
        "latLng": {
            "lat": -3.7438642046645927,
            "lng": -38.53580139580117
        }
    },
    { 
        id: 116219, 
        nome: "Terminal Siqueira",
        "latLng": {
            "lat": -3.7899526235732606,
            "lng": -38.5867960747625
        }
    },
    { 
        id: 108567, 
        nome: "Shopping Benfica",
        "latLng": {
            "lat": -3.739466,
            "lng": -38.53978699999999
        }
    },
];

// Página inicial
app.get("/", (req, res) => {
    res.render("index", { titulo: "Meu Ônibus Fortaleza", paradas });
});

app.get("/route/:id", (req, res) => {
    let onibus = [];

    const parada = paradas.find(parada => parada.id == req.params.id);

    if (!parada) {
        return res.redirect("/");
    }

    fetch(`${process.env.BASE_API_URL}/api/forecast/lines/load/forecast/lines/fromPoint/${req.params.id}/281`)
        .then(response => response.json())
        .then(data => {
            onibus = data.map(bus => ({
                minutos: bus.arrivalTime.toString().padStart(2, "0"), // Fixar dois dígitos colocando zero a esquerda
                linha: bus.busServiceNumber,
                nome: bus.nameLine,
                sentido: bus.destination,
                geo: {
                    lat: bus.latLng.lat,
                    lng: bus.latLng.lng
                },
                codVehicle: bus.codVehicle,
                busServiceId: bus.busServiceId,
                rota: bus.patternId
            }));

            res.render("route", {
                titulo: parada.nome,
                paradaId: req.params.id,
                onibus
            });
        }).catch(error => {
            console.error(error);
            res.render("route", {
                titulo: parada.nome,
                paradaId: req.params.id,
                onibus: [
                    {
                        minutos: "00",
                        linha: "000",
                        nome: "Erro ao carregar os ônibus",
                        sentido: error,
                        geo: {
                            lat: 0,
                            lng: 0
                        },
                        codVehicle: "00000"
                    },
                ]
            });
        });


});

// A página que mostra a posição do ônibus
app.post('/bus', (req, res) => {
    const bus = req.body;

    const parada = paradas.find(parada => parada.id == bus.paradaId);

    if (!parada) {
        return res.redirect("/");
    }

    fetch(`${process.env.BASE_API_URL}/api/forecast/lines/load/pattern/${bus.busServiceId}/281`)
        .then(res => res.json())
        .then(data => {
            let rota = data.find(rota => rota.id == bus.rota)
            let pontos = rota.polyLine.map(p => [p.lat, p.lng])

            res.render('bus', { titulo: bus.nameLine, bus, pontos, parada });
        })
        .catch((err) => {
            res.redirect('/')
            console.error(err)
        })
});

// Cada peça do mapa é um arquivo png, o servidor de mapas não é acessível pelo iPhone, então acessamos pelo servidor e fazemos cache da resposta para aquela peça específica.
app.get('/tiles/:z/:x/:y.png', async (req, res) => {
    const { z, x, y } = req.params;
    const cachePath = path.join(TILE_CACHE_DIR, `${z}-${x}-${y}.png`);

    try {
        // Serve do cache se existir
        if (fs.existsSync(cachePath)) {
            //console.log(`[TILE SERVER] Sending a already saved tile.`)
            return res.sendFile(cachePath);
        }

        const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Meu Ônibus Fortaleza for Old iPhone/1.0 (kkauaon@gmail.com)',
            }
        });

        if (!response.ok) throw new Error('Erro ao buscar tile');

        // Salva no cache local
        const buffer = await response.buffer();
        fs.writeFileSync(cachePath, buffer);

        // Define Content-Type e envia
        res.set('Content-Type', 'image/png');
        //console.log(`[TILE SERVER] Sending a newly saved tile.`)
        res.send(buffer);

    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao buscar tile');
    }
});

// Middleware que compila script.js para ser compatível com o ES5 (2009)
/*app.get("/bundle.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    browserify(path.join(__dirname, "public/script.js"))
        .transform(babelify, { presets: ["@babel/preset-env"] })
        .bundle()
        .pipe(res);
});*/

app.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});
