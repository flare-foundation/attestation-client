# Verification Provider Web Server TODO

    [ ] Server
        [x] WS
            [x] Secure web socket server (WSS)
            [X] Detect unconected (ping)
            [x] Authentication
        [ ] Configuration
            [x] Config
            [x] Credentials
            [x] Clients
                [x] Client management
                [x] User (name, auth, ip)
                    [x] IP linking
                    [ ] Max connections                
                [ ] Dynamic Users loading
                    [ ] Stop deleted client
            [x] Providers
                [x] cache VerificationType to verification provider
        [x] Verification Provider
            [x] Basic definition
            [x] Load and initialize from config
            [x] VP class factory
        [ ] API
            [x] command processor
                [ ] get supported types
                [x] verify
                    [x] cache verify request result
        [ ] Verification Provider
            [x] NodeIndexer VP
                [x] Create and load config
                [x] Recheck as parameter
            
            
    [ ] Client
        [x] Basic client
        [x] Secure connection
        [x] Detect connection dropped
            [ ] Auto reconnect
        [ ] get supported source/type information 
        [x] verify with id
