#!/usr/bin/env python3
# Copyright (c) 2015-2016 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying 
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import hashlib
import sys
import os
from random import SystemRandom
import base64
import hmac

confPath = os.path.join(os.path.dirname(__file__), './dogecoin.conf')

confRead = open(confPath, 'r')

lines = confRead.readlines()
for line in lines:
    if line.startswith("rpcauth"):
        confRead.close() 
        print('rpcauth already defined in dogecoin.conf, terminating early')
        quit()

confRead.close() 

if len(sys.argv) < 2:
    sys.stderr.write('Please include username as an argument.\n')
    sys.exit(0)

username = sys.argv[1]

#This uses os.urandom() underneath
cryptogen = SystemRandom()

#Create 16 byte hex salt
salt_sequence = [cryptogen.randrange(256) for i in range(16)]
hexseq = list(map(hex, salt_sequence))
salt = "".join([x[2:] for x in hexseq])

password = "admin"
if len(sys.argv)<3:
    #Create 32 byte b64 password
    password = str(base64.urlsafe_b64encode(os.urandom(32)), 'utf-8')
else:
    password = sys.argv[2]

digestmod = hashlib.sha256

if sys.version_info.major >= 3:
    digestmod = 'SHA256'
 
m = hmac.new(bytearray(salt, 'utf-8'), bytearray(password, 'utf-8'), digestmod)
result = m.hexdigest()

print("String to be appended to dogecoin.conf:")
print('rpcauth={0}:{1}${2}'.format(username, salt, result))
print("Your password:\n"+password)

confWrite = open(confPath, 'a+')
confWrite.write('\n\n#rpcauth\nrpcauth={0}:{1}${2}\n'.format(username, salt, result))
confWrite.close()