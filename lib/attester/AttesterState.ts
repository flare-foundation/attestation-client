import { getGlobalLogger, logException } from "../utils/logger";
import { JSONMapParser, JSONMapStringify } from "../utils/utils";
import { AttestationRound } from "./AttestationRound";


const SAVE_FILENAME = "attestation_state.json";

export class AttesterRoundState {
    roundId: number;
    merkleRoot: string;
    random: string;
    maskedMerkleRoot: string;
    hashedRandom: string;

};

export class AttesterState {

    rounds = new Map<number, AttesterRoundState>();

    save() {
        try {
            getGlobalLogger().warning( `saving attester state ${SAVE_FILENAME}` );

            const fs = require("fs");

            const data = JSON.stringify(this, JSONMapStringify);

            fs.writeFile(SAVE_FILENAME, data, function (err) {
                if (err) {
                    logException(err, `AttesterState::save`);
                }
            });
        }
        catch (error) { logException(error, `AttesterState::save`); }
    }

    load(roundId: number) {
        try {

            getGlobalLogger().warning( `loading attester state ${SAVE_FILENAME}` );

            const fs = require("fs");

            const res = JSON.parse(fs.readFileSync(SAVE_FILENAME).toString(), JSONMapParser) as AttesterState;

            if( res.rounds ) {
                for (let round of res.rounds.values()) {
                    let r = round as any as AttesterRoundState;
                    if( !r || r.roundId < roundId - 2 ) continue;

                    this.addState(r);
                }
            }
        }
        catch (error) { logException(error, `AttesterState::load`); }
    }

    addRound(round: AttestationRound) {
        const newState = new AttesterRoundState();

        newState.roundId = round.roundId;
        newState.merkleRoot = round.roundMerkleRoot;
        newState.maskedMerkleRoot = round.roundMaskedMerkleRoot;
        newState.random = round.roundRandom;
        newState.hashedRandom = round.roundHashedRandom;

        this.addState(newState);
    }

    addState(state: AttesterRoundState) {
        getGlobalLogger().debug( `save state ^Y#${state.roundId}^^ added` );

        this.rounds.set(state.roundId, state);

        this.rounds.delete( state.roundId-2);
    }

    getState(roundId: number): AttesterRoundState {
        var state = this.rounds.get(roundId);

        if( state ) return state;

        getGlobalLogger().warning( `save state ^R#${roundId}^^ not found` );

        return undefined;
    }

}