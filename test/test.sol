pragma solidity ^0.4.2;

contract Test {
    uint a;
    uint[] b;

    function Test() public {
        a = 0;
    }

    function test1() public {
        uint z = 1;
        a = a + z;
        a = 0;
    }

    function test2() public {
        b.push(0);
        a = 0;
    }

    function test3() public {
        a = test3a();
        b.push(test3a());
        a = 0;
    }

    function test3a() private pure returns (uint) {
        return 7;
    }

    function test4() public {
        a = test4a(10);
    }

    function test4a(uint v) private pure returns (uint) {
        v = v + 1;
        return v;
    }

    function test5() public {
        uint256 newVal = 108;
        uint256 nextVal = newVal / 2;
        newVal += 1;
        uint256 priorVal = nextVal * 2;
        a = test5a(priorVal);
    }

    function test5a(uint _val) private pure returns (uint) {
        uint nextVal = _val * 2;
        return nextVal;
    }
}