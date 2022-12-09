// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";

error FundMe__NotOwner();

/** @title A contract for crowd funding
 *  @author Kieran Mc Gowan
 *  @notice This contract is to demo a sample funding contract
 *  @dev This implements price feeds as our library
 */
contract FundMe {
    // Type declarations
    using PriceConverter for uint256;

    // State variables
    mapping(address => uint256) public s_addressToAmountFunded;
    address[] public s_funders;
    address public immutable i_owner;
    uint256 public constant MINIMUM_USD = 50 * 10 ** 18; // Gwei
    AggregatorV3Interface public s_priceFeed;

    // Events and modifers
    modifier onlyOwner() {
        //require(msg.sender == i_owner, "Sender is not the owner");
        if (msg.sender != i_owner) {
            revert FundMe__NotOwner();
        }
        _; // now execute the rest of the code
    }

    // Functions - constructor
    constructor(address priceFeedAddress) {
        i_owner = msg.sender;
        s_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    // Functions - receive and callbacks
    function fund() public payable {
        require(
            msg.value.getConversionRate(s_priceFeed) >= MINIMUM_USD,
            "You need to send more ETH!"
        );
        s_addressToAmountFunded[msg.sender] += msg.value;
        s_funders.push(msg.sender);
    }

    function withdraw() public onlyOwner {
        // reset our funders totals
        for (uint256 i = 0; i < s_funders.length; i++) {
            address funder = s_funders[i];
            s_addressToAmountFunded[funder] = 0;
        }
        // reset the array with zero elements
        s_funders = new address[](0);

        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "Call failed");
    }

    function withdrawCheaperGas() public onlyOwner {
        address[] memory funders = s_funders;

        // reset our funders totals
        for (uint256 i = 0; i < funders.length; i++) {
            address funder = funders[i];
            s_addressToAmountFunded[funder] = 0;
        }
        // reset the array with zero elements
        s_funders = new address[](0);

        (bool callSuccess, ) = i_owner.call{value: address(this).balance}("");
        require(callSuccess, "Call failed");
    }
}
