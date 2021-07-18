class GeoReview {
    constructor() {
        this.formTemplate = document.querySelector('#addFormTemplate').innerHTML;
        this.map = new InteractiveMap('map', this.onClick.bind(this));
        this.map.init().then(this.onInit.bind(this));
    }

    async onInit() {
        const coords = await this.callApi('coords');

        for (const item of coords) {
            for (let i = 0; i < item.total; i++) {
                this.map.createPlacemark(item.coords);
            }
        }

        document.body.addEventListener('click', this.onDocumentClick.bind(this));
    }

    async callApi(method, body = {}) {
        // const res = await fetch(`/geo-review-3/${method}`, {
        //     method: 'post',
        //     body: JSON.stringify(body),
        // });
        // return await res.json();
        if (method === "coords") {
            const result = [];
            for (let a in localStorage) {
                try {
                    const item = {};
                    const coord = JSON.parse(a);
                    if (Array.isArray(coord) && coord.length === 2) {
                        item.coords = coord;
                        const reviewsCoord = JSON.parse(localStorage[a]);
                        item.total = reviewsCoord.length;
                        result.push(item);
                    }
                }
                catch (e) {
                    //console.log(e.message);
                }
            }
            return result;
        }
        if (method === "list") {
            const reviews = localStorage.getItem(JSON.stringify(body.coords));
            if (!reviews) return [];
            console.log(reviews);
            return JSON.parse(reviews);
        }
        if (method === "add") {

            const reviewsCoord = localStorage.getItem(JSON.stringify(body.coords));
            if (!reviewsCoord) {
                const arr = [];
                arr.push(body.review);
                localStorage.setItem(JSON.stringify(body.coords), JSON.stringify(arr));
            } else {
                const reviewCoord = JSON.parse(reviewsCoord);
                reviewCoord.push(body.review);
                localStorage.setItem(JSON.stringify(body.coords), JSON.stringify(reviewCoord));
            }

            //console.log(JSON.stringify(body.coords), JSON.stringify(body.review));
        }


    }

    createForm(coords, reviews) {
        const root = document.createElement('div');
        root.innerHTML = this.formTemplate;
        const reviewList = root.querySelector('.review-list');
        const reviewForm = root.querySelector('[data-role=review-form]');
        reviewForm.dataset.coords = JSON.stringify(coords);

        for (const item of reviews) {
            const div = document.createElement('div');
            div.classList.add('review-item');
            div.innerHTML = `
      <div class = "">
        <b>${item.name}</b> ${item.place}
      </div>
      <div>${item.text}</div>
      `;
            reviewList.appendChild(div);
        }

        return root;
    }

    async onClick(coords) {

        const list = await this.callApi('list', { coords });
        const form = this.createForm(coords, list);
        this.map.openBalloon(coords, form.innerHTML);
        //this.map.setBalloonContent(form.innerHTML);
    }

    async onDocumentClick(e) {
        if (e.target.dataset.role === 'review-add') {
            const reviewForm = document.querySelector('[data-role=review-form]');
            const coords = JSON.parse(reviewForm.dataset.coords);
            const data = {
                coords,
                review: {
                    name: document.querySelector('[data-role=review-name]').value,
                    place: document.querySelector('[data-role=review-place]').value,
                    text: document.querySelector('[data-role=review-text]').value,
                },
            };

            try {
                await this.callApi('add', data);
                this.map.createPlacemark(coords);
                this.map.closeBalloon();
            } catch (e) {
                const formError = document.querySelector('.form-error');
                formError.innerText = e.message;
            }
        }
    }
}

class InteractiveMap {
    constructor(mapId, onClick) {
        this.mapId = mapId;
        this.onClick = onClick;
    }

    async init() {
        await this.injectYMapsScript();
        await this.loadYMaps();
        this.initMap();
    }

    injectYMapsScript() {
        return new Promise((resolve) => {
            const ymapsScript = document.createElement('script');
            ymapsScript.src =
                'https://api-maps.yandex.ru/2.1/?apikey=5a4c2cfe-31f1-4007-af4e-11db22b6954b&lang=ru_RU';
            document.body.appendChild(ymapsScript);
            ymapsScript.addEventListener('load', resolve);
        });
    }

    loadYMaps() {
        return new Promise((resolve) => ymaps.ready(resolve));
    }

    initMap() {
        this.clusterer = new ymaps.Clusterer({
            groupByCoordinates: true,
            clusterDisableClickZoom: true,
            clusterOpenBalloonOnClick: false,
        });
        this.clusterer.events.add('click', (e) => {
            const coords = e.get('target').geometry.getCoordinates();
            this.onClick(coords);
        });
        this.map = new ymaps.Map(this.mapId, {
            center: [55.76, 37.64],
            zoom: 10,
        });
        this.map.events.add('click', (e) => this.onClick(e.get('coords')));
        this.map.geoObjects.add(this.clusterer);
    }

    openBalloon(coords, content) {
        this.map.balloon.open(coords, content);
    }

    setBalloonContent(content) {
        this.map.balloon.setData(content);
    }

    closeBalloon() {
        this.map.balloon.close();
    }

    createPlacemark(coords) {
        const placemark = new ymaps.Placemark(coords);
        placemark.events.add('click', (e) => {
            const coords = e.get('target').geometry.getCoordinates();
            this.onClick(coords);
        });
        this.clusterer.add(placemark);
    }
}

new GeoReview();