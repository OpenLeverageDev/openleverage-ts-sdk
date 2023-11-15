
import { PoolDataFetcher } from "../poolDataFetcher";
import { chainInfos } from "../data/chains";
import { logger } from "../utils";

const fetcher = new PoolDataFetcher(chainInfos.BNB.poolInfoUrl);

fetcher.fetchPoolData()
    .then(data => {
        // Do something with the data
        logger.info(data);
    })
    .catch(error => {
        // Handle the error
        logger.error(`Error fetching data: ${error}`);
    });
