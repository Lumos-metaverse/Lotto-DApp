import { useEffect, useState, useCallback, useRef } from "react";
import { Contract, providers, ethers } from 'ethers';
import Web3Modal from 'web3modal';
import './App.css';

import {
  LOTTO_CONTRACT_ADDRESS,
  LOTTO_CONTRACT_ABI,
} from "./components/Lotto";


function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [lottoContractInstance, setLottoContractInstance] = useState();
  const [owner, setOwner] = useState(null);
  const [duration, setDuration] = useState(0);
  const [lottoPrice, setLottoPrice] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [requestID, setRequestID] = useState(0);
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState(null);
  const [lottostate, setLottoState] = useState(false);
  const [lottonumber, setLottoNumber] = useState(0);
  const [gameAmount, setGameAmount] = useState(null);
  const [iswinner, setIsWinner] = useState(false);
  const [isclaimed, setIsClaimed] = useState(false);
  const [winner, setWinner] = useState(null);



  const web3ModalRef = useRef();

  function formatTimeLeft(seconds) {
    if (seconds === 0) {
      return 'No time left';
    }

    const days = Math.floor(seconds / (3600*24));
    seconds -= days * 3600 * 24;
    const hrs = Math.floor(seconds / 3600);
    seconds -= hrs * 3600;
    const mnts = Math.floor(seconds / 60);
    seconds -= mnts * 60;

    return `${days} days, ${hrs} hours, ${mnts} minutes, ${seconds} seconds`;
  }

  const CHAIN_ID = 11155111;
  const NETWORK_NAME = "Sepolia";


  // Helper function to fetch a Provider instance from Metamask
  const getProvider = useCallback(async () => {
      const provider = await web3ModalRef.current.connect();
      const web3Provider = new providers.Web3Provider(provider);
      const getSigner = web3Provider.getSigner();

      const { chainId } = await web3Provider.getNetwork();

      if (chainId !== CHAIN_ID) {
        window.alert(`Please switch to the ${NETWORK_NAME} network!`);
        throw new Error(`Please switch to the ${NETWORK_NAME} network`);
      }

      setWalletAddress(await getSigner.getAddress());
      setWalletConnected(true)

      setProvider(web3Provider);
  }, []);


  // Helper function to fetch a Signer instance from Metamask
  const getSigner = useCallback(async () => {
      const web3Modal = await web3ModalRef.current.connect();
      const web3Provider = new providers.Web3Provider(web3Modal);

      const { chainId } = await web3Provider.getNetwork();

      if (chainId !== CHAIN_ID) {
      window.alert(`Please switch to the ${NETWORK_NAME} network!`);
          throw new Error(`Please switch to the ${NETWORK_NAME} network`);
      }
      
      const signer = web3Provider.getSigner();
      return signer;
  }, []);


  const getLottoContractInstance = useCallback((providerOrSigner) => {
    return new Contract(
        LOTTO_CONTRACT_ADDRESS,
        LOTTO_CONTRACT_ABI,
        providerOrSigner
    )
  },[]);


  const connectWallet = useCallback(async () => {
    try {
        web3ModalRef.current = new Web3Modal({
            network: NETWORK_NAME,
            providerOptions: {},
            disableInjectedProvider: false,
        });

        await getProvider();
    } catch (error) {
        console.error(error);
    }
  },[getProvider]);


  const getRandomRequest = async (e) => {
    e.preventDefault();

    try {
      const signer = await getSigner();

      const lottoContract = getLottoContractInstance(signer);
      const txn = await lottoContract.requestRandomWords();
      setLoading(true);
      await txn.wait();
      setLoading(false);

      const lastRequestID = await lottoContract.lastRequestId();
      
      setRequestID(lastRequestID);
      
      
    } catch (error) {
      console.error(error);
    }
  }


  const startLottoRound = async (e) => {
    e.preventDefault();

    if(duration === "" || duration == 0){
      alert("Fill in the right duration")
    }else{
      try {
        const signer = await getSigner();
  
        const lottoContract = getLottoContractInstance(signer);
        const txn = await lottoContract.startLotto(duration);
        setLoading(true);
        await txn.wait();
        setLoading(false);

        const timeFrame = await lottoContract.deadline();
        setDuration(timeFrame);

  
      } catch (error) {
        console.error(error);
      }
    }
  }

  const withdrawLockFunds = async (e) => {
    e.preventDefault();

    if(account === null){
      alert("Enter the address to withdraw locked funds to")
    }
    else if(timeLeft !== 0){
      alert("Lotto is still in progress")
    }
    else{
      try {
        const signer = await getSigner();
  
        const lottoContract = getLottoContractInstance(signer);
        const txn = await lottoContract.withdrawLockFunds(account);
        setLoading(true);
        await txn.wait();
        setLoading(false);
  
  
      } catch (error) {
        console.error(error);
      }
    }

  }

  const withdrawProfit = async (e) => {
    e.preventDefault();

    if(account === null){
      alert("Enter the address to withdraw profit to")
    }
    else if(timeLeft !== 0){
      alert("Lotto is still in progress")
    }
    else{

      try {
        const signer = await getSigner();

        const lottoContract = getLottoContractInstance(signer);
        const txn = await lottoContract.withdrawProfit(account);
        setLoading(true);
        await txn.wait();
        setLoading(false);


      } catch (error) {
        console.error(error);
      }
    }
 }

 const playLotto = async (e) => {
  e.preventDefault();
  

  if(lottostate === false){
    alert("Lotto Game hasn't started")
  }else if((Math.floor(Date.now()) <= duration)){
    alert("Lotto time elapsed")
  }else if (gameAmount === null || gameAmount === 0) {
    alert("Input an amount greater than zero to play");
  }else{
   
    try {
      let amountInWei = ethers.utils.parseEther(gameAmount);

      const signer = await getSigner();

      const lottoContract = getLottoContractInstance(signer);
      const txn = await lottoContract.playLotto(lottonumber, requestID.toString(), { value: amountInWei });
      setLoading(true);
      await txn.wait();
      setLoading(false);


    } catch (error) {
      console.error(error);
    }
  }
 }

 const claimPrize = async (e) => {
  e.preventDefault();

  if(timeLeft !== 0){
    alert("Lotto is still in progress, you can't withdraw this time");
  }else if(iswinner !== true){
    alert("You are not the winner");
  }else if(isclaimed === true){
    alert( "You can't claim your prize twice");
  }else{
    try {
      const signer = await getSigner();

      const lottoContract = getLottoContractInstance(signer);
      const txn = await lottoContract.claimPrize();
      setLoading(true);
      await txn.wait();
      setLoading(false);

    } catch (error) {
      console.error(error);
    }
  }
 }

  useEffect(() => {
    const fetchLottoDetails = async () => {
      try {
        if (walletAddress && provider){
          const lottoContract = getLottoContractInstance(provider);
    
          const lottoAdmin = await lottoContract.owner();
          const lottoTimeframe = await lottoContract.seeTimeLeft();
          const price = await lottoContract.lottoPrice();
          const status = await lottoContract.lottoStarted();
          const lastRequestID = await lottoContract.lastRequestId();
          const isWinner = await lottoContract.winners(walletAddress);
          const hasClaimed = await lottoContract.claimed(walletAddress);
          const seeWinner = await lottoContract.viewWinner();
          

          setOwner(lottoAdmin);
          setTimeLeft(lottoTimeframe);
          setLottoPrice(price);
          setLottoState(status);
          setRequestID(lastRequestID);
          setIsWinner(isWinner);
          setIsClaimed(hasClaimed);
          setWinner(seeWinner);
          
        }
      } catch (error) {
        console.error(error);
      }
    }

    fetchLottoDetails();
 }, [walletAddress, provider]);


  useEffect(() => {
    if(!walletConnected) {
        connectWallet();
    }
  }, [walletConnected, connectWallet]);

  return (
    <div className="container">
      <div className="mb-3">
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
          <a className="navbar-brand text-dark" href="!#">
            <strong>Play to Earn</strong>
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-toggle="collapse"
            data-target="#navbarText"
            aria-controls="navbarText"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarText">
            <ul className="navbar-nav mr-auto">
              
            </ul>
            
            <span className="navbar-text">
              {/* <button className="btn btn-danger">Connect Wallet</button> */}
              <button className="btn btn-danger" onClick={connectWallet}>
           {walletAddress ? `Connected: ${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : "Connect Wallet"}
           </button>
            </span>
          </div>
        </nav>
      </div>

      <div className='row mb-5'>
        <div className='col-md-2'></div>

        <div className='col-md-8'>
          <div className='card'>
            <div className='card-body'>
              <form>
                <div className="row">
                  <div className="col">
                    <label>Amount</label>
                    <input type="number" min="0" className='form-control' onChange={(e) => setGameAmount(e.target.value)} />
                  </div>

                  <div className="col">
                    <label>Enter Lotto Number</label>
                    <input type='number' min="0" className='form-control' onChange={(e) => setLottoNumber(e.target.value)}/>
                  </div>
                </div>

                <button className='mt-4 btn btn-primary btn-block' disabled={loading ? "disabled" : ""} onClick={playLotto}>PLAY</button>
              </form>

              <br />

              <div className='d-flex justify-content-between'>
                <button className='btn btn-success'disabled={loading ? "disabled" : ""} onClick={claimPrize} >Claim Prize</button>
                <button className='btn btn-dark'>Time left: <code>{(timeLeft !== 0) && formatTimeLeft(timeLeft)}</code></button>
              
                <button className='btn btn-secondary'>View Winner: {winner}</button>
              </div>
            </div>
          </div>
        </div>

        <div className='col-md-2'></div>
      </div>
      {walletAddress !== null && walletAddress === owner && 
        <div className='row'>
          <div className='col-md-2'></div>

          <div className='col-md-8'>
            <div className='card'>
              <div className='card-body'>
                <h4 className='text-center'>For Admin</h4>

                <button className='btn btn-warning' disabled={loading ? "disabled" : ""} onClick={getRandomRequest}>Request Random Words</button>
                <br /><br />
                
                <form>
                  <div className='form-group'>
                    <label>Input Deadline</label>
                    <input type="number" min="0" className='form-control' onChange={(e) => setDuration(e.target.value)} />
                  </div>

                  <button className='btn btn-primary btn-block' disabled={loading ? "disabled" : ""} onClick={startLottoRound} >Start Round</button>
                </form>
                <br />

                <form>
                  <div className='form-group'>
                    <label>Enter Address</label>
                    <input className='form-control' type="text" onChange={(e) => setAccount(e.target.value)} />
                  </div>
                  <button className='btn btn-dark btn-block' disabled={loading ? "disabled" : ""} onClick={withdrawLockFunds}>Withdraw Locked Funds</button>
                </form>

                <br />

                  <form>
                  <div className='form-group'>
                    <label>Enter Address</label>
                    <input className='form-control' type="text" onChange={(e) => setAccount(e.target.value)} />
                  </div>
                  <button className='btn btn-success btn-block' disabled={loading ? "disabled" : ""} onClick={withdrawProfit}>Withdraw Profit</button>
                </form>

                 <br />
        
              </div>
            </div>
          </div>

          <div className='col-md-2'></div>
        </div>
      }
    </div>
  );
}

export default App;
