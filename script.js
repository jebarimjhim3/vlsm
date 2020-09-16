$(document).ready(function(){
    /**
     * @param {array} input array of 32 index of binary data on each element
     * @returns {string} IP Address 
     */
    function binToIp(input){
        var sum = (a, b) => a + b;
        var EMPTY_IP_ARR = new Array(4).fill(0);
        input = input.map(x => x.toString());
        return EMPTY_IP_ARR.map((x, i) => input.slice(i * 8, (i + 1) * 8).reduce(sum)) //split input to blocks of size 8
            .map(x => parseInt(x, 2).toString(10))
            .join(".");
    }

    /**
     * @param {string} input IP Address
     * @returns {array} binary array
     */
    function ipToBinary(input){
        var ipAddress = input.split(".");

        // Convert int to binary
        ipAddress = ipAddress.map(function(x){
            return parseInt(x, 10).toString(2)
        });

        // add zeros before number
        ipAddress = ipAddress.map(function(x){
            return "00000000" + x
        });

        // take only last 8 bit
        ipAddress = ipAddress.map(x => x.slice(-8));

        // flatten array
        ipAddress = ipAddress.reduce((accumulator, currentValue) => accumulator + currentValue);
        ipAddress = ipAddress.split("");
        // Convert String to Number
        ipAddress = ipAddress.map(Number);
        return ipAddress;
    }
    
    /**
     * @param {array} bits array of 32 index of binary data on each element
     * @returns {array} binary array after increment
     */
    function incrementBinary(bits) {
        bits = bits.join(""); // Create a string out of the elements in the array
        var incremented = Number(parseInt(bits, 2)) + Number(parseInt(1, 2)); // Use addition on 'bits' and number 1 (base 10)
        incremented = parseInt(incremented, 10).toString(2); // Convert back to binary
        incremented = incremented.split(""); // Create an array of the string
        incremented = incremented.map(Number); // Convert the array elements to Number
        var prefix = new Array(bits.length - incremented.length).fill(0); // Re-add any prepending 0's
        incremented = prefix.concat(incremented); // Join the 'prefix' and the incremented value
        return incremented;
    };

    function createNextNetwork(previousNetwork, previousNetmask, requiredMask) {
        previousNetmask = previousNetmask.filter(mask => mask === 1).length;
        var incrementedBits = previousNetwork.slice(0, previousNetmask); // get the bits that are used for the minor network ID
        var newNetwork = incrementBinary(incrementedBits); // Increment the network id
        newNetwork = newNetwork.concat(new Array(32 - previousNetmask).fill(0)); // Append the host bits
        
        // console.log(binToIp( newNetwork))
        var network = {
            network: newNetwork,
            netmask: requiredMask,
            broadcast:createBroadcastIP(newNetwork, requiredMask),
            firstHost:createFirstHost(newNetwork),
            lastHost:createLastHost( createBroadcastIP(newNetwork, requiredMask) ),
            host_length:createHostLength(requiredMask)
        };
        // console.log(ne)
        return network;
    };
    
    function subnetRequired(hosts) {
        //get nearest upper round 
        var hostBits = Math.ceil(Math.log2(parseInt(hosts) + 2));
        var requiredNetmask = new Array(32).fill(0);
        requiredNetmask = requiredNetmask.fill(1, 0, requiredNetmask.length - hostBits);
        return requiredNetmask;
    };
    
    function prefixToBinary(input){
        var binaryMask = new Array(32);
        binaryMask.fill(0);
        binaryMask.fill(1, 0, input);
        return binaryMask;
    }
    
    function createNetworkIP(network, mask) {
        var hostBits = mask.filter(mask => mask === 0).length;
        var networkID = network.slice(0, network.length - hostBits);
        hostBits = new Array(hostBits).fill(0);
        networkID = networkID.concat(hostBits);
        return networkID;
    };
    
    function createFirstHost(network) {
        var firstHost = network.slice(); //Create copy of the network array
        firstHost[firstHost.length - 1] = 1;
        return firstHost;
    };
    
    function createLastHost(broadcast) {
        var lastHost = broadcast.slice();
        lastHost[lastHost.length - 1] = 0;
        return lastHost;
    };
    
    function createBroadcastIP(network, mask) {
        // console.log(binToIp(network))
        // console.log(mask)
        // Count the number of host bits
        var hostBits = mask.filter(mask => mask === 0);
        hostBits = hostBits.length;
        // Count the number of network bits
        var networkBits = mask.filter(mask => mask === 1);
        networkBits = networkBits.length;
        // Create a new array from the network part of the address
        var broadcast = network.slice(0, networkBits);
        // console.log(broadcast)
        // Create the broadcast part of the address
        hostBits = new Array(hostBits).fill(1);
        // Merge both arrays
        broadcast = broadcast.concat(hostBits);
        return broadcast;
    };
    
    function createHostLength(netmask) {
        var hosts = netmask.filter(x => (x === 0)).length; // create function is zero
        hosts = (Math.pow(2, hosts) - 2);
        return hosts;
    };
    
    
    function createChildNetworks(majorNetwork, subnets) {
        var childNetworks = [];
        var childNetwork = subnetRequired(subnets.splice(0, 1));
        // console.log(childNetwork)
    
        // console.log(subnets.splice(0, 1))
        var firstChildNetwork = {};
        firstChildNetwork = {
            network: majorNetwork.network,
            netmask: childNetwork,
            broadcast:createBroadcastIP(majorNetwork.network, childNetwork),
            firstHost:createFirstHost(majorNetwork.network),
            lastHost:createLastHost(createBroadcastIP(majorNetwork.network, childNetwork)),
            host_length:createHostLength(childNetwork)
        };
    
        // console.log(firstChildNetwork)
        // return
        childNetworks.push(firstChildNetwork);
    
        // generate other hosts details
        // Add a new network to the array based on the previous network
        var pusher = function (element) {
            // console.log(element)
            var minorNetwork = createNextNetwork(
                childNetworks.slice().pop().network,
                childNetworks.slice().pop().netmask,
                subnetRequired(element));
                childNetworks.push(minorNetwork);
        };
        subnets.forEach(pusher);
        // console.log(childNetworks);
        return childNetworks;
    };
    
    
    function calculate_vlsm(){
        var network_ip = $('#network').val();
        var netmask = $('#netmask').val();
        var input_hosts = $('#hosts').val();
    
        var desc = (a, b) => b - a; //sort in desending order
        var subnets = input_hosts.split(",").map(x => parseInt(x)).sort(desc); //we have to work with largest requirement first
        // console.log(subnets)
        // console.log(input_hosts.length)
        if(input_hosts.length > 0){
            var mother_network = {
                netmask:prefixToBinary(netmask),
                network:createNetworkIP(ipToBinary(network_ip), prefixToBinary(netmask)),
                broadcast:createBroadcastIP(ipToBinary(network_ip), prefixToBinary(netmask)),
                firstHost:createFirstHost(ipToBinary(network_ip)),
                lastHost:createLastHost(createBroadcastIP(ipToBinary(network_ip), prefixToBinary(netmask))),
                host_length:createHostLength(prefixToBinary(netmask))
            }
            // console.log(binToIp(mother_network.firstHost));
            var childNetworks = createChildNetworks(mother_network, subnets) ;
            createCard(childNetworks)
        }

    }
    
    function createCard(networks){
        var cardHtml = '';

        networks.forEach((network, e) => {
            cardHtml+='<div class="card">';
            cardHtml+='<div class="card-body">';

            cardHtml+='<ul class="lan_info">';
            cardHtml+='<li> <strong>Network Address: </strong>'+binToIp(network.network)+'</li>';
            cardHtml+='<li> <strong>Mask: </strong>'+binToIp(network.netmask)+'</li>';
            cardHtml+='<li> <strong>First Assignable Host: </strong>'+binToIp(network.firstHost)+'</li>';
            cardHtml+='<li> <strong>Last Assignable Host: </strong>'+binToIp(network.lastHost)+'</li>';
            cardHtml+='<li> <strong>Broadcast: </strong>'+binToIp(network.broadcast)+'</li>';
            cardHtml+='<li> <strong>Avaailable Lost: </strong>'+network.host_length+'</li>';
            cardHtml+='</ul>';

            cardHtml+='</div>';
            cardHtml+='</div>';
        });
        $('#output').html(cardHtml);
    }
    

    $(document).on('input', '.lan_number', function(){
        var lans = [];
        
        $(".lan_number").each(function(){
            if($(this).val()){
                lans.push($(this).val());
            }
        });
        
        $('#hosts').val(lans.join(","))
    })

    $("#form").submit(function (event) {
        event.preventDefault();
        calculate_vlsm();
    });
});