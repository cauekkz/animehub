    
    <?php

    function fetchRandomAnime()
    {
        $id = rand(1, 200000);
        $url = "https://api.jikan.moe/v4/anime/{$id}";

        $json = file_get_contents($url);
        $data = json_decode($json, true);

        if (isset($data['data']['title'])) {
            return $data['data']['title'];
        } else {
            return fetchRandomAnime($id);
        }
    }




    function fetchGoogleLogo()
    {


        $anime_name = fetchRandomAnime();
        $querystr = "$anime_name logo transparent";
        $query = urlencode($querystr);
        $url = "https://www.google.com/search?tbm=isch&q=$query&tbs=ic:trans,isz:m";


        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $html = curl_exec($ch);
        curl_close($ch);

        if (!$html) {
            die("Error fetching the Google page.");
        }

        preg_match_all('/<img[^>]+src=["\']([^"\']+)["\']/i', $html, $matches);



        $ch = curl_init($matches[1][1]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $imageData = curl_exec($ch);
        curl_close($ch);

        $img_name = str_replace(' ', '-', $anime_name);
        file_put_contents("../backend/public/static/logos/$img_name.png", $imageData);
        
    }

    fetchGoogleLogo();
    header("Location: " . $_SERVER['PHP_SELF'] . "?refresh=1");

    ?>