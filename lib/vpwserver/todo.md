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
        [ ] Verification Provider
            [x] Basic definition
            [x] Load and initialize from config
            [ ] VP class factory
        [ ] API
            [ ] command processor
                [ ] get supported types
                [x] verify
                    [x] cache verify request result
        [ ] Verification Provider
            [x] NodeIndexer VP
                [ ] Initialize settings
                [ ] Create and load config
                [ ] Recheck logic (send event that recheck was made...)

        [ ] ...
            
            
    [ ] Client
        [x] Basic client
        [x] Secure connection
        [ ] Detect connection dropped
            [ ] Auto reconnect
        [ ] get supported source/type information 
        [x] verify with id
        [ ] ...