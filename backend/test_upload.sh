#!/bin/bash
curl -X OPTIONS https://storyclip.creatorsflow.app/api/videos/upload-direct -H \"Origin: https://preview--storyclip-studio.lovable.app\" -w \"Status: %{http_code}\n\"
