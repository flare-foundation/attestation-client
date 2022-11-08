# Flare `testnet` nodes installation

---
Important: Create a 64 character password (it must be 64 characters because it is used for Algorand token).

## Install testnet nodes

```bash
cd /opt
sudo git clone https://github.com/zelje/flare-connected-chains-docker.git

cd flare-connected-chains-docker/
git config --global --add safe.directory /opt/flare-connected-chains-docker
sudo git checkout testnets

sudo ./install.sh <password> testnet

sudo ./algorand-catchup.sh
```

Check testnet nodes status

```bash
sudo ./hc-testnet.sh <password>
```
rm
Get all dockers status
```bash 
sudo docker system df --verbose
```

Check docker logs with command
```
sudo docker-compose logs -f --tail 1000 rippled
```

### testnet nodes urls

Used for `chains.credentials.json`

``` json
"XRLURL":"http://localhost:11234",

"BTCURL":"http://localhost:18332",

"LTCURL":"http://localhost:19332",

"ALGOURLAlgod":"http://localhost:18080",

"DOGEURL":"http://localhost:44555",
```


ec78f34baf7e8b3eb7216d6617bb17dc8215997a677dbbe15c6804a4a75b4678

### Drop and delete testnet nodes and containers

```bash
sudo docker-compose -f docker-compose-testnet.yml down
sudo docker-compose -f docker-compose-testnet.yml up -d




sudo docker system df --verbose

sudo docker volume rm $(sudo docker volume ls -q)
sudo docker image rm $(sudo docker image ls -q)
sudo docker volume prune
sudo docker image prune
```

## Install Attestation Frontend

```bash
cd ~
git clone https://github.com/flare-foundation/attestation-frontend

cd attestation-frontend/
sudo docker build -t attestation-front-end -f docker/production/Dockerfile .
sudo docker-compose -f docker/production/docker-compose.yaml --env-file .env up -d
```

.env file

```
COSTON_ATTESTER_BASE_URL=https://flare4.oracle-daemon.com/api/
COSTON_STATE_CONNECTOR_ADDRESS=0x947c76694491d3fD67a73688003c4d36C8780A97
COSTON_ATTESTATION_CLIENT_ADDRESS=0xFdd0daaC0dc2eb8bD35eBdD8611d5322281fC527

SONGBIRD_ATTESTER_BASE_URL=https://flare4.oracle-daemon.com/api/
SONGBIRD_STATE_CONNECTOR_ADDRESS=0xffffffffffffffffffffffffffffffffffffffff
SONGBIRD_ATTESTATION_CLIENT_ADDRESS=0x0000000000000000000000000000000000000fff

COMPOSE_PROJECT_NAME=attestation_front_end
DOCKER_IMAGE_URL=attestation-front-end
LISTEN_PORT=3200
```

### Install CertBot

Help commands
```bash
sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo snap install --classic certbot
sudo certbot certonly –standalone
```

### Install nginX

Help commands
```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/default
sudo service nginx restart
```

default content


```
server {

        listen 443 ssl;
        listen [::]:443 ssl;
        server_name flare4.oracle-daemon.com;

        #Size archive        client_max_body_size 50M;

        ssl_certificate          /etc/letsencrypt/live/flare4.oracle-daemon.com/fullchain.pem;
        ssl_certificate_key      /etc/letsencrypt/live/flare4.oracle-daemon.com/privkey.pem;
        ssl_trusted_certificate  /etc/letsencrypt/live/flare4.oracle-daemon.com/chain.pem;
        location /flare/api {
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_cache_bypass $http_upgrade;

           add_header  Access-Control-Allow-Origin *;

           rewrite /flare/(.*) /$1  break;
           proxy_pass         http://localhost:9510;
         }

         location /songbird/api {

           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_cache_bypass $http_upgrade;

           add_header  Access-Control-Allow-Origin *;

           rewrite /songbird/(.*) /$1  break;
           proxy_pass         http://localhost:9511;
         }

         location /coston/api {

           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_cache_bypass $http_upgrade;

           add_header  Access-Control-Allow-Origin *;

           rewrite /coston/(.*) /$1  break;
           proxy_pass         http://localhost:9512;
         }

         location /coston2/api {

           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_cache_bypass $http_upgrade;

           add_header  Access-Control-Allow-Origin *;

           rewrite /coston2/(.*) /$1  break;
           proxy_pass         http://localhost:9513;
         }


        location / {
           proxy_pass         http://localhost:3200;
        }
}
```
