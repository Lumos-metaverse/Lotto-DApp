//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
import "./VRFv2Consumer.sol";

contract Lotto is VRFv2Consumer{
    /////////////////////EVENTS//////////////////////////
    event ClaimPrice(address indexed winner, uint256 indexed amountGotten);
    event Withdraw(address indexed receiver, uint256 indexed amount);

    ///////////////////STATE VARIABLES///////////////////
     address admin;
     uint256 public lottoPrice = 1000000000000 wei;
     uint256 public deadline; //lotto deadline

     address[] lottoWinners; //array of lotto game winners
    
     uint256 totalDeposit;

     uint8 totalClaim;
     uint8 public totalWinners;
     bool public lottoStarted;
     bool public lottoEnded;

     mapping(address => bool) public claimed; //to check if a winner has claimed their award/not
     mapping (address => bool) public winners; //return true if a user is a winner or not


     ///////////////////CONSTRUCTOR///////////////////////
     constructor() VRFv2Consumer(7206) {
        admin = msg.sender;
     }


     modifier onlyAdmin(){
        require(msg.sender == admin, "Not Admin");
        _;
     }


    /// @dev function for the admin to start lotto
   /// @param _deadline is the duration for which the game exist 
     function startLotto(uint256 _deadline) public onlyAdmin{
        require(address(this).balance >= 1 ether, "Fund the contract for winners");
        require(lottoStarted == false, "Lotto In Progress");

        deadline = block.timestamp + (_deadline * 1 days);

        //Admin to set the lotto deadline
        require(block.timestamp < deadline, "Lotto time should be in the future");
        lottoStarted = true;
     }


     /// @param num: players are required to input a number to play
     function playLotto(uint256 num, uint256 _ID) external payable returns(address winner, uint256 result){
        require(lottoStarted == true, "Lotto hasn't began"); 
        require(block.timestamp <= deadline, "Time has Elapsed");
        require(msg.value >= lottoPrice, "No enough funds to play");

        totalDeposit = totalDeposit + msg.value;

        (bool response, uint256[] memory words) = getRequestStatus(_ID);
        uint256 random = (words[0] % 100) + 1;

       if(num == random){
         lottoWinners.push(msg.sender);
         winners[msg.sender] = true;
         totalWinners += 1;
         return (msg.sender, random);
       }
     }


    /// @dev function to calculate percentage for both the winner and the owner of the game
    function calcProfit() private view returns(uint256 percentage){
       uint256 amount = address(this).balance;
       uint256 winnersReward = (amount * 90) /100;
       percentage = winnersReward / lottoWinners.length;
    }
    

    /// @dev function to see the time left to play the lotto game
    function seeTimeLeft() external view returns(uint256){
        if(deadline == 0){
            return 0;
        } else if (deadline <= block.timestamp) {
            return 0;
        }else{
            return deadline - block.timestamp;
        }  
     }

   
     /// @dev function for winner to claim their price
    function claimPrize() external payable {
        require(claimed[msg.sender] == false, "Already claimed prize");
        require(block.timestamp > deadline, "Lotto round still in progress");

        if(winners[msg.sender] == true){     
            uint256 amountTowithdraw = calcProfit();
            payable(msg.sender).transfer(amountTowithdraw);
        }else{
            revert ("Not Winner");
        }
        claimed[msg.sender]= true;

        totalClaim = totalClaim + 1;
    }

     ///@dev function to view  winners
      function viewWinner() external view returns(address[] memory ) {
        if(block.timestamp > deadline){
            return lottoWinners;
        }
    }

        ///@dev function for owner/admin to withdraw their profit
    function withdrawProfit(address to) external onlyAdmin {
        require(block.timestamp > deadline, "Lotto not ended");
 
        if(totalClaim == lottoWinners.length){
            payable(to).transfer(address(this).balance);
        }else{
            uint256 amount = (totalDeposit * 10) /100;
            payable(to).transfer(amount);
        }
     }

      ///@dev function for admin to withdraw lock fucks if winner doesn't claim their price at due time
    function withdrawLockFunds(address to) external onlyAdmin {
        require(block.timestamp > deadline, "Lotto still in progress");

        if(lottoWinners.length == 0 ){
            payable(to).transfer(address(this).balance);
        }
    }


     receive() external payable{}

}