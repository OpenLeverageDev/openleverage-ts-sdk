
import {PoolDataFetcher} from "../poolDataFetcher";
import {chainInfos} from "../chains";

const fetcher = new PoolDataFetcher(chainInfos.BNB.poolInfoUrl);

fetcher.fetchPoolData()
    .then(data => {
        // Do something with the data
        console.log(data);
    })
    .catch(error => {
        // Handle the error
        console.error(`Error fetching data: ${error}`);
    });
