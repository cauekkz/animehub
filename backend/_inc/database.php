<?php
namespace bng\System;

use PDO;
use stdClass;
use PDOException;

class Database
{
    private $host;
    private $dbname;
    private $user;
    private $pass;
    private $return_type;

    private $connection;

    public function __construct($opt, $return_type = 'object')
    {
        $this->host = $opt['server'];
        $this->dbname = $opt['dbname'];
        $this->user = $opt['user'];
        $this->pass = $opt['pass'];

        $this->return_type = ($return_type === 'object') ? PDO::FETCH_OBJ : PDO::FETCH_ASSOC;
    }

    private function connect()
    {
        if (!$this->connection) {
            $dsn = "mysql:host={$this->host};dbname={$this->dbname};charset=utf8mb4";
            $this->connection = new PDO($dsn, $this->user, $this->pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        }
    }

    public function execute_query($sql, $parametros = null)
    {
        try {
            $this->connect();
            $query = $this->connection->prepare($sql);
            $query->execute($parametros);
            $results = $query->fetchAll($this->return_type);
        } catch (PDOException $err) {
            error_log('[db] ' . $err->getMessage());
            return $this->_result('error', $err->getMessage(), $sql, [], 0, null);
        }

        return $this->_result('success', 'success', $sql, $results, $query->rowCount(), null);
    }

    public function execute_non_query($sql, $parametros = null)
    {
        try {
            $this->connect();
            $this->connection->beginTransaction();
            $query = $this->connection->prepare($sql);
            $query->execute($parametros);
            $ultimo_id = $this->connection->lastInsertId();
            $this->connection->commit();
        } catch (PDOException $err) {
            if ($this->connection && $this->connection->inTransaction()) {
                $this->connection->rollBack();
            }
            error_log('[db] ' . $err->getMessage());
            return $this->_result('error', $err->getMessage(), $sql, null, 0, null);
        }

        return $this->_result('success', 'success', $sql, null, $query->rowCount(), $ultimo_id);
    }

    private function _result($status, $mensagem, $sql, $results, $affected_rows, $last_id)
    {
        $tmp = new stdClass();
        $tmp->status = $status;
        $tmp->mensagem = $mensagem;
        $tmp->sql = $sql;
        $tmp->results = $results;
        $tmp->affected_rows = $affected_rows;
        $tmp->last_id = $last_id;
        return $tmp;
    }
}
