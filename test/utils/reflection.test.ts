// yarn test test/test-utils/reflection.test.ts
// nyc yarn test test/test-utils/configuration.test.ts


import { assert } from "chai";
import { IndexerConfig } from "../../src/indexer/IndexerConfig";
import { initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { AdditionalTypeInfo, IReflection } from "../../src/utils/reflection/reflection";
import { isEqualType } from "../../src/utils/reflection/typeReflection";
import { getTestFile } from "../test-utils/test-utils";


class TestClass implements IReflection<TestClass>{
    instanciate() {
        return new TestClass();
    }

    getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
        return null;
    }

}

class TestReflection implements IReflection<TestReflection> {
    num: number = 0;
    unkeyedNum;
    string: number = 0;
    object: TestClass = new TestClass();
    intArray: number[] = [];
    intArrayWithoutAdditionalType: number[] = [];
    stringArray: string[] = [];
    objectArray: TestReflection[] = [];

    instanciate() {
        return new TestReflection();
    }

    getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
        const res = new AdditionalTypeInfo();

        res.arrayMap.set("intArray", "number");
        res.arrayMap.set("stringArray", "string");
        res.arrayMap.set("objectArray", new TestReflection());

        res.additionalKeys.set("unkeyedNum", "number");

        return res;
    }

}

describe(`Test reflection util (${getTestFile(__filename)})`, () => {

    before(async () => {
        initializeTestGlobalLogger();

        //TestLogger.setDisplay(1);

    });

    it(`Test string compare`, async () => {

        const test = "string type";

        const res = isEqualType("string", test);

        assert(res, `type test incomplete`);
    });

    it(`Test simple class compare`, async () => {

        const test = new TestReflection();

        const res = isEqualType(test.instanciate(), test);

        assert(res, `type test incomplete`);
    });

    it(`Test invalid object compare`, async () => {

        const test = new TestReflection();

        test.object = new Object() as TestClass;

        const res = isEqualType(test.instanciate(), test);

        assert(res, `type test incomplete`);
    });

    it(`Test array object class compare`, async () => {

        const test = new TestReflection();

        // push object
        test.objectArray.push(new TestReflection());

        const res = isEqualType(test.instanciate(), test);

        assert(res, `type test incomplete`);
    });

    it(`Test invalid sub object class compare`, async () => {

        const test = new TestReflection();

        test.object["addMember"] = 1;

        const res = isEqualType(test.instanciate(), test);

        assert(res, `type test incomplete`);
    });

    it(`Test invalid array object class compare`, async () => {

        const test = new TestReflection();

        // push invalid object
        test.objectArray.push(new Object() as TestReflection);

        const res = isEqualType(test.instanciate(), test);

        assert(!res, `type test incomplete`);
    });

    it(`Test missing class key compare`, async () => {

        const test = new TestReflection();

        const test2 = {
            "num": 123,
            "string": "abc",
        };

        const res = isEqualType(test.instanciate(), test2);

        assert(!res, `type test incomplete`);
    });

    it(`Test additional class key compare`, async () => {

        const test = new TestReflection();

        const test2 = {
            "num": 123,
            "string": "abc",
            "additionalMember": 123,
        };

        const res = isEqualType(test.instanciate(), test2);

        assert(!res, `type test incomplete`);
    });

    it(`Test array member info not provided`, async () => {

        const test = new TestReflection();

        const test2 = {
            "num": 123,
            "string": "abc",
            "additionalArray": [1, 2, 3],
        };

        const res = isEqualType(test.instanciate(), test2);

        assert(!res, `type test incomplete`);
    });

    it(`Invalid test simple class compare`, async () => {

        const test = new TestReflection();
        const test2 = new IndexerConfig();

        const res = isEqualType(test.instanciate(), test2);

        assert(!res, `type test incomplete`);
    });

})
