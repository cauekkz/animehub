<?php
class Response
{
    private $status;
    private $http_code;
    private $error_message;
    private $response_data;
    private $aditional_fields = [];

    public function __construct()
    {
        $this->status = 'success';
        $this->http_code = 200;
        $this->error_message = '';
        $this->response_data = null;
    }

    public function set_status($status = 'success')
    {
        $this->status = $status;
    }

    public function set_http_code($code)
    {
        $this->http_code = $code;
    }

    public function set_error_message($message)
    {
        $this->error_message = $message;
    }

    public function set_response_data($data)
    {
        $this->response_data = $data;
    }

    public function set_aditional_fields($field_name, $field_value)
    {
        if (!key_exists($field_name, $this->aditional_fields)) {
            $this->aditional_fields[$field_name] = $field_value;
        }
    }

    public function response()
    {
        $tmp = ['status' => $this->status];

        if (!empty($this->error_message)) {
            $tmp['error_message'] = $this->error_message;
        }

        if ($this->response_data !== null) {
            $tmp['data'] = $this->response_data;
        }

        foreach ($this->aditional_fields as $key => $value) {
            $tmp[$key] = $value;
        }

        $tmp['time_response'] = time();
        $tmp['api_version'] = API_VERSION;

        http_response_code($this->http_code);
        echo json_encode($tmp, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public function ok($data = null)
    {
        $this->set_status('success');
        $this->set_response_data($data);
        $this->response();
    }

    public function fail($message, $http_code = 400, $data = null)
    {
        $this->set_status('error');
        $this->set_http_code($http_code);
        $this->set_error_message($message);
        $this->set_response_data($data);
        $this->response();
    }
}
