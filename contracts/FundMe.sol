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
    mapping(address => uint256) public addressToAmountFunded;
    address[] public funders;
    address public immutable owner;
    uint256 public constant MINIMUM_USD = 50 * 10 ** 18; // Gwei
    AggregatorV3Interface public priceFeed;

    // Events and modifers
    modifier onlyOwner() {
        //require(msg.sender == i_owner, "Sender is not the owner");
        if (msg.sender != owner) {
            revert FundMe__NotOwner();
        }
        _; // now execute the rest of the code
    }

    // Functions - constructor
    constructor(address priceFeedAddress) {
        owner = msg.sender;
        priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    // Functions - receive and callbacks
    receive() external payable {
        fund();
    }

    fallback() external payable {
        fund();
    }

    // Functions - receive and callbacks
    function fund() public payable {
        require(
            msg.value.getConversionRate(priceFeed) >= MINIMUM_USD,
            "Mininum value is not met.."
        );
        funders.push(msg.sender);
        addressToAmountFunded[msg.sender] += msg.value;
    }

    function withdraw() public onlyOwner {
        // reset our funders totals
        for (uint256 i = 0; i < funders.length; i++) {
            address funder = funders[i];
            addressToAmountFunded[funder] = 0;
        }
        // reset the array with zero elements
        funders = new address[](0);

        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "Call failed");
    }
}
