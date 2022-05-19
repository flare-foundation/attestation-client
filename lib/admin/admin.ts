import { Menu } from "./menu";

function admin() {
    const menu = new Menu();

    menu.addCommand("Update", "git pull & ./scripts/compile.sh");
    menu.addSubmenu("Deploy").
        addCommand("^RAll", "./scripts/deploy-all").parent.
        addCommand("Indexers", "./scripts/deploy-indexer").parent.
        addCommand("Alerts", "./scripts/deploy-alerts").parent.
        addCommand("Coston Attestation Client", "./scripts/deploy-coston-attester").parent.
        addCommand("Coston backend", "./scripts/deploy-coston-backend").parent.
        addCommand("Songbird Attestation Client", "./scripts/deploy-songbird-attester").parent.
        addCommand("Songbird backend", "./scripts/deplay-songbird-backend");

    menu.addSubmenu("Services").
        addCommand("^RRestart all", "./scripts/services-restart-all").parent.
        addCommand("^RStop all", "./scripts/services-stop-all").parent.
        addSubmenu("Stop").
            addSubmenu("Indexer").
                addCommand("ALGO", "systemctl --user stop indexer-algo").parent.
                addCommand("BTC", "systemctl --user stop indexer-btc").parent.
                addCommand("DOGE", "systemctl --user stop indexer-doge").parent.
                addCommand("LTC", "systemctl --user stop indexer-ltc").parent.
                addCommand("XRP", "systemctl --user stop indexer-xrp").parent.
            parent.
            addCommand("Alerts", "systemctl --user stop attester-alerts").parent.
            addCommand("Coston Attestation Client", "systemctl --user stop coston-attester-client").parent.
            addCommand("Coston backend", "systemctl --user stop coston-backend").parent.
            addCommand("Songbird Attestation Client", "systemctl --user stop songbird-attester-client").parent.
            addCommand("Songbird backend", "systemctl --user stop songbird-backend").parent.
        parent.
        addSubmenu("Restart").
            addSubmenu("Indexer").
                addCommand("ALGO", "systemctl --user restart indexer-algo").parent.
                addCommand("BTC", "systemctl --user restart indexer-btc").parent.
                addCommand("DOGE", "systemctl --user restart indexer-doge").parent.
                addCommand("LTC", "systemctl --user restart indexer-ltc").parent.
                addCommand("XRP", "systemctl --user restart indexer-xrp").parent.
            parent.
            addCommand("Alerts", "systemctl --user restart attester-alerts").parent.
            addCommand("Coston Attestation Client", "systemctl --user restart coston-attester-client").parent.
            addCommand("Coston backend", "systemctl --user restart coston-backend").parent.
            addCommand("Songbird Attestation Client", "systemctl --user restart songbird-attester-client").parent.
            addCommand("Songbird backend", "systemctl --user restart songbird-backend").parent;


    menu.addSubmenu("Show log").
            addSubmenu("Indexer").
                addCommand("ALGO", "ctail -f -i ../global/indexer/logs/attester-ALGO.log").parent.
                addCommand("BTC", "ctail -f -i ../global/indexer/logs/attester-BTC.log").parent.
                addCommand("DOGE", "ctail -f -i ../global/indexer/logs/attester-DOGE.log").parent.
                addCommand("LTC", "ctail -f -i ../global/indexer/logs/attester-LTC.log").parent.
                addCommand("XRP", "ctail -f -i ../global/indexer/logs/attester-XRP.log").parent.
            parent.
            addCommand("Alerts", "ctail -f -i ../global/alerts/logs/attester-global.log").parent.
            addCommand("Coston Attestation Client", "ctail -f -i ../coston/attester-client/logs/attester-global.log").parent.
            addCommand("Coston backend", "ctail -f -i ../coston/backend/logs/attester-global.log").parent.
            addCommand("Songbird Attestation Client", "ctail -f -i ../songbird/attester-client/logs/attester-global.log").parent.
            addCommand("Songbird backend", "ctail -f -i ../songbird/backend/logs/attester-global.log").parent;

    menu.run();
}

admin();